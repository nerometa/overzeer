# =============================================================================
# Overzeer - Production Build
# =============================================================================
# Strategy:
#   - Web (Next.js): Bun build with Node.js runtime (avoids compatibility issues)
#   - Server (Elysia): Bun runtime with full workspace support
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install all dependencies with Bun (shared base)
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

# Install all dependencies
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build Next.js with Bun
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS web-builder
WORKDIR /app

ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy source code
COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY packages ./packages

# Build with Bun
RUN cd apps/web && bun run build

# ---------------------------------------------------------------------------
# Stage 3: Server Production Runtime (Bun with workspace support)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS server
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer && \
    mkdir -p /data && chown overzeer:overzeer /data

# Copy pre-installed dependencies from deps stage
COPY --from=deps --chown=overzeer:overzeer /app/node_modules ./node_modules
COPY --chown=overzeer:overzeer package.json bun.lock turbo.json tsconfig.base.json ./

# Copy source code
COPY --chown=overzeer:overzeer apps/server ./apps/server
COPY --chown=overzeer:overzeer packages ./packages

USER overzeer
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "apps/server/src/index.ts"]

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

USER overzeer
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "apps/web/server.js"]
