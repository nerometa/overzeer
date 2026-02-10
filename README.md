# Overzeer

Centralized analytics hub for event ticket sales across multiple platforms. Aggregates data from Megatix, Ticketmelon, Resident Advisor, and manual at-door entries into a unified dashboard with real-time revenue projections and performance metrics.

Built with [Better T Stack](https://github.com/AmanVarshney01/create-better-t-stack) — Next.js 15, Elysia, tRPC, Drizzle ORM, SQLite, Better Auth, and Bun.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TailwindCSS 4, shadcn/ui |
| Backend | Elysia, tRPC 11, Bun runtime |
| Database | SQLite (Turso-compatible), Drizzle ORM |
| Auth | Better Auth |
| Monorepo | Turborepo, Bun workspaces |
| Language | TypeScript (end-to-end type safety) |

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/) v1.3+

```bash
# Install dependencies
bun install

# Push database schema
bun run db:push

# Seed sample data
bun run db:seed

# Start development servers
bun run dev
```

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3001 |
| Server (Elysia) | http://localhost:3000 |
| tRPC endpoint | http://localhost:3000/trpc |

## Project Structure

```
overzeer/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   │   ├── src/app/      # App Router pages
│   │   ├── src/components/
│   │   └── src/utils/    # tRPC client
│   └── server/           # Elysia backend server
│       └── src/index.ts
├── packages/
│   ├── api/              # tRPC routers & procedures
│   ├── auth/             # Better Auth configuration
│   ├── db/               # Drizzle schema, migrations, seed
│   │   ├── src/schema/   # Table definitions
│   │   └── src/seed.ts   # Sample data seeder
│   ├── env/              # Environment variable validation
│   └── config/           # Shared TypeScript config
├── turbo.json
└── package.json
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `user`, `session`, `account`, `verification` | Better Auth tables |
| `events` | Event definitions (name, date, venue, capacity) |
| `platforms` | Ticket platforms (Megatix, Ticketmelon, RA, At-Door) |
| `sales` | Ticket sales records per event per platform |
| `projections` | Revenue projection snapshots |
| `manual_sales` | At-door / manual entry sales |

## Available Scripts

```bash
bun run dev          # Start all apps in dev mode
bun run build        # Build all packages
bun run check-types  # TypeScript type checking

bun run db:push      # Push schema to database
bun run db:generate  # Generate migration files
bun run db:migrate   # Run migrations
bun run db:seed      # Seed sample data
bun run db:reset     # Reset DB + reseed
bun run db:studio    # Open Drizzle Studio

bun run dev:web      # Start only frontend
bun run dev:server   # Start only backend
```

## Environment Variables

**`apps/server/.env`:**
```
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=file:../../local.db
```

**`apps/web/.env`:**
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## License

MIT
