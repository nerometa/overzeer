# Server Dockerfile - Elysia with Bun
FROM oven/bun:1.3.8-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

# Copy source
COPY apps/server ./apps/server
COPY packages ./packages

# Install dependencies
RUN bun install --frozen-lockfile

# Production image
FROM oven/bun:1.3.8-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer && \
    mkdir -p /data && chown overzeer:overzeer /data

COPY --from=builder --chown=overzeer:overzeer /app/node_modules ./node_modules
COPY --from=builder --chown=overzeer:overzeer /app/package.json ./
COPY --from=builder --chown=overzeer:overzeer /app/apps/server ./apps/server
COPY --from=builder --chown=overzeer:overzeer /app/packages ./packages

USER overzeer
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "apps/server/src/index.ts"]
