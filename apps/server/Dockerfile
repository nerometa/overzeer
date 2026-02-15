FROM oven/bun:1.3.8-alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
RUN bun install --frozen-lockfile

COPY apps/server ./apps/server
COPY packages ./packages
RUN bun run --filter=server build

FROM oven/bun:1.3.8-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && adduser -u 1001 -S overzeer -G overzeer
RUN mkdir -p /data && chown overzeer:overzeer /data

COPY --from=builder --chown=overzeer:overzeer /app/apps/server/dist ./dist
COPY --from=builder --chown=overzeer:overzeer /app/node_modules ./node_modules
COPY --from=builder --chown=overzeer:overzeer /app/packages/db/drizzle.config.ts ./packages/db/
COPY --from=builder --chown=overzeer:overzeer /app/packages/db/src/schema ./packages/db/src/schema
COPY --from=builder --chown=overzeer:overzeer /app/packages/db/package.json ./packages/db/

USER overzeer
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["bun", "run", "dist/index.mjs"]
