# =============================================================================
# Overzeer Server — Production Multi-Stage Build
# =============================================================================
# Elysia + tRPC API server running on Bun
#
# Build:  docker build -t overzeer-server -f apps/server/Dockerfile .
# Run:    docker run -p 3000:3000 --env-file .env overzeer-server
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock turbo.json ./

# Copy all workspace package.json files (for dependency resolution)
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

# Install all dependencies (monorepo requires full install)
RUN bun install --frozen-lockfile --production=false

# ---------------------------------------------------------------------------
# Stage 2: Build the server
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS builder

WORKDIR /app

# Copy installed node_modules and workspace files
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json ./

# Copy source code for server and its workspace dependencies
COPY apps/server/ apps/server/
COPY packages/ packages/

# Build server (tsdown bundles @overzeer/* into dist/index.mjs)
RUN bun run --filter=server build

# ---------------------------------------------------------------------------
# Stage 3: Production runner
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 overzeer && \
    adduser --system --uid 1001 --ingroup overzeer overzeer

# Create data directory for SQLite persistence
RUN mkdir -p /data && chown overzeer:overzeer /data

# Copy built server bundle
COPY --from=builder /app/apps/server/dist ./dist

# Copy production node_modules (runtime deps like @libsql/client, elysia, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Copy drizzle config + schema for running migrations via docker exec
COPY --from=builder /app/packages/db/drizzle.config.ts ./packages/db/drizzle.config.ts
COPY --from=builder /app/packages/db/src/schema ./packages/db/src/schema
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json

USER overzeer

EXPOSE 3000

# Health check — server returns "OK" at GET /
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "dist/index.mjs"]
