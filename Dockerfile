# =============================================================================
# Overzeer - Unified Production Build
# =============================================================================
# Strategy: Node.js for Next.js (stable), Bun for server (fast)
# This avoids Bun segmentation faults with Next.js 16 + React 19
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies with Node (for compatibility)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Install Bun in Node image (needed for workspace installs)
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    mv ~/.bun/bin/bun /usr/local/bin/bun

# Copy package files
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

# Install all dependencies
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build Next.js with Node.js (AVOIDS BUN CRASHES)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web-builder
WORKDIR /app

# Install Bun for workspace compatibility
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    mv ~/.bun/bin/bun /usr/local/bin/bun

ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy source code
COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY packages ./packages

# Build Next.js with Node (stable, no crashes)
RUN cd apps/web && npm run build

# ---------------------------------------------------------------------------
# Stage 3: Build Server with Bun (fast compilation)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS server-builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy source code
COPY apps/server ./apps/server
COPY packages ./packages

# Build server with Bun
RUN bun run --filter=server build

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
# Stage 5: Server Production Runtime (Bun for performance)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS server
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer && \
    mkdir -p /data && chown overzeer:overzeer /data

# Copy built server and node_modules
COPY --from=server-builder --chown=overzeer:overzeer /app/apps/server/dist ./dist
COPY --from=server-builder --chown=overzeer:overzeer /app/node_modules ./node_modules
COPY --from=server-builder --chown=overzeer:overzeer /app/packages/db/drizzle.config.ts ./packages/db/
COPY --from=server-builder --chown=overzeer:overzeer /app/packages/db/src/schema ./packages/db/src/schema

USER overzeer
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "dist/index.mjs"]
