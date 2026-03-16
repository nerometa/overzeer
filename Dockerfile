# Use Bun as runtime
FROM oven/bun:1-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code (exclude .env - will be provided at runtime)
COPY src/ ./src/
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY components.json ./

# Build Next.js app (skip DB push, use existing DB)
RUN SKIP_DB_PUSH=1 bun run build

EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["bun", "run", "start"]
