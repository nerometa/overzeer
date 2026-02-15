FROM oven/bun:1.3.8-alpine AS base
WORKDIR /app

FROM base AS builder
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
RUN bun install --frozen-lockfile

COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY packages ./packages
RUN bun run --filter=web build

FROM oven/bun:1.3.8-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && adduser -u 1001 -S overzeer -G overzeer

COPY --from=builder --chown=overzeer:overzeer /app/apps/web/.next/standalone ./
COPY --from=builder --chown=overzeer:overzeer /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=overzeer:overzeer /app/apps/web/public ./apps/web/public

USER overzeer
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["bun", "run", "apps/web/server.js"]
