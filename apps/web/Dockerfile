# Web Dockerfile - Next.js with Bun build, Node runtime
FROM oven/bun:1.3.8-alpine AS builder
WORKDIR /app

# Build-time: use public URL for browser (NEXT_PUBLIC_* is baked into bundle)
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
ENV NODE_ENV=production

# Copy package files
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/

# Copy source
COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY packages ./packages

# Install dependencies
RUN bun install --frozen-lockfile

# Build Next.js
RUN cd apps/web && bun run build

# Production image - Node.js for stability
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S overzeer && \
    adduser -u 1001 -S overzeer -G overzeer

COPY --from=builder --chown=overzeer:overzeer /app/apps/web/.next/standalone ./
COPY --from=builder --chown=overzeer:overzeer /app/apps/web/.next/static ./apps/web/.next/static

USER overzeer
EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "apps/web/server.js"]
