# =============================================================================
# Overzeer - Simplified Production Build
# =============================================================================
# Strategy:
#   - Web (Next.js): Node.js for stability (avoids Bun segfaults with React 19)
#   - Server (Elysia): Bun compile to single binary (efficient, minimal image)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install all dependencies (shared base)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS deps
WORKDIR /app

# Copy all package files for workspace installation
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

# Install all dependencies (including devDependencies needed for build)
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build Next.js with Node.js (STABLE - avoids Bun crashes)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web-builder
WORKDIR /app

# Install Bun in Node image (needed to copy deps from Bun stage)
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    mv ~/.bun/bin/bun /usr/local/bin/bun

ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY packages ./packages

# Build with Node.js (stable, no segmentation faults)
RUN cd apps/web && npm run build

# ---------------------------------------------------------------------------
# Stage 3: Build Server with Bun Compile (SINGLE BINARY)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS server-builder
WORKDIR /app

# Copy all dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/server ./apps/server
COPY packages ./packages

# Compile to single binary with all dependencies bundled
# This creates a self-contained executable, no node_modules needed at runtime
RUN bun build --compile \
    --minify-whitespace \
    --minify-syntax \
    --sourcemap \
    --bytecode \
    --outfile server \
    ./apps/server/src/index.ts

# ---------------------------------------------------------------------------
# Stage 4: Web Production Runtime (Node.js for stability)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer

# Copy standalone Next.js build
COPY --from=web-builder --chown=overzeer:overzeer /app/apps/web/.next/standalone ./
COPY --from=web-builder --chown=overzeer:overzeer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-builder --chown=overzeer:overzeer /app/apps/web/public ./apps/web/public

USER overzeer
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "apps/web/server.js"]

# ---------------------------------------------------------------------------
# Stage 5: Server Production Runtime (Minimal - single binary)
# ---------------------------------------------------------------------------
FROM alpine:3.20 AS server
WORKDIR /app

# Install wget for healthcheck (minimal dependencies)
RUN apk add --no-cache wget && \
    addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer && \
    mkdir -p /data && chown overzeer:overzeer /data

# Copy only the compiled binary (no node_modules needed!)
COPY --from=server-builder --chown=overzeer:overzeer /app/server ./

USER overzeer
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["./server"]
