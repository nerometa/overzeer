# =============================================================================
# Overzeer Dockerfile - Production Multi-Stage Build
# =============================================================================
# Usage:
#   docker build -t overzeer .
#   docker run -p 3000:3000 -p 3001:3001 overzeer
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.8-debian AS deps

WORKDIR /app

# Copy package files
COPY package.json turbo.json ./
COPY packages packages/
COPY apps apps/

# Install dependencies (hoisted to root)
RUN bun install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.8-debian AS builder

WORKDIR /app

# Copy lockfile and installed node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY package.json turbo.json ./
COPY packages packages/
COPY apps apps/

# Build all apps
RUN bun run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runner
# -----------------------------------------------------------------------------
FROM oven/bun:1.3.8-debian AS runner

WORKDIR /app

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --home-dir /app --shell /bin/sh overzeer

# Copy built artifacts
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/turbo.json ./turbo.json

# Copy environment file template and create actual env
COPY --from=builder /app/apps/server/.env.example ./apps/server/.env 2>/dev/null || true

# Change ownership
RUN chown -R overzeer:nodejs /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

USER overzeer

# Expose ports (server: 3000, web: 3001)
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command - runs both server and web
# Server runs on 3000, Web on 3001
CMD ["bun", "run", "dev:native"]
