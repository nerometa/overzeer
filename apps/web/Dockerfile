# =============================================================================
# Overzeer Web — Production Multi-Stage Build
# =============================================================================
# Next.js 16 frontend with standalone output (runs on Node.js)
#
# Build:  docker build -t overzeer-web -f apps/web/Dockerfile .
# Run:    docker run -p 3001:3001 -e NEXT_PUBLIC_SERVER_URL=http://server:3000 overzeer-web
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS deps

WORKDIR /app

COPY package.json bun.lock turbo.json ./

COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

RUN bun install --frozen-lockfile --production=false

# ---------------------------------------------------------------------------
# Stage 2: Build Next.js (standalone output)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.8-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json ./

COPY apps/web/ apps/web/
COPY apps/server/ apps/server/
COPY packages/ packages/

# NEXT_PUBLIC_SERVER_URL must be set at build time (baked into client bundle)
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

RUN bun run --filter=web build

# ---------------------------------------------------------------------------
# Stage 3: Production runner (Node.js for Next.js standalone)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 overzeer && \
    adduser --system --uid 1001 -G overzeer overzeer

# Copy standalone server
COPY --from=builder /app/apps/web/.next/standalone ./

# Copy static assets and public files
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER overzeer

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "apps/web/server.js"]
