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

## Features

- **Event Management**: Create and manage events with date, venue, and capacity
- **Multi-Platform Sales Tracking**: Aggregate sales from Megatix, Ticketmelon, Resident Advisor, and manual at-door entries
- **Real-time Analytics**: Revenue trends, platform breakdown, sales velocity, and projections
- **Manual Sale Entry**: Easy-to-use form for entering door sales with platform selection, ticket types, and fee calculation
- **Sales Editing**: Click any sale to edit details or delete entries
- **CSV Export**: Export event sales data for accounting or reporting
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Full dark mode support with CSS variables

## Testing

```bash
# Run all tests
bun test

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy (Vercel)

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy frontend
cd apps/web
vercel

# Deploy backend
cd apps/server
vercel
```

## Architecture

### Type Safety

This project uses **tRPC** for end-to-end type safety between frontend and backend. No API contract files needed - TypeScript types are shared automatically.

```typescript
// Frontend calls backend with full type safety
const { data: events } = trpc.events.list.useQuery();
// TypeScript knows the exact shape of 'events'
```

### Monorepo Structure

- **Turborepo** manages the build pipeline with intelligent caching
- **Bun** provides fast package installation and script execution
- **Workspace** packages allow code sharing between apps

### Performance

- Bun runtime: 3x faster than Node.js for package installation and tests
- Next.js 15: React Server Components and streaming SSR
- tRPC batching: Multiple requests in a single HTTP call
- Optimistic UI: Instant feedback for mutations

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/new-feature`
3. Commit changes: `git commit -am 'feat: add new feature'`
4. Push to branch: `git push origin feat/new-feature`
5. Submit a pull request

## Roadmap

- [x] Event management
- [x] Sales tracking (manual + platforms)
- [x] Analytics dashboard
- [x] Sales editing and deletion
- [x] CSV export
- [x] E2E tests
- [ ] Real API integrations (Megatix, Ticketmelon, RA)
- [ ] Email notifications
- [ ] Multi-user support with roles
- [ ] Mobile app

## License

MIT
