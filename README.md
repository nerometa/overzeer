# Overzeer

Centralized analytics hub for event ticket sales across multiple platforms. Aggregates data from Megatix, Ticketmelon, Resident Advisor, and manual at-door entries into a unified dashboard with real-time revenue projections and performance metrics.

Built with [Better T Stack](https://github.com/AmanVarshney01/create-better-t-stack) — Next.js 16, Elysia, tRPC, Drizzle ORM, SQLite, Better Auth, and Bun.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4, shadcn/ui |
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
│   ├── web/              # Next.js 16 frontend
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
# Run unit tests
bun run test

# Run E2E tests
bun run test:e2e
```

## Deployment

Overzeer can be deployed to **Vercel** (managed) or **Dokploy** (self-hosted).

### Option 1: Vercel (Managed)

Best for zero-config deployment with automatic scaling.

**Deploy:**
1. Import your repository in Vercel dashboard
2. Configure both services:

**Server:**
- Framework: Other
- Build Command: `bun run build`
- Output Directory: `apps/server/dist`
- Install Command: `bun install`

**Web:**
- Framework: Next.js
- Build Command: `bun run build`
- Output Directory: `apps/web/.next`

**Environment Variables:**

Server:
```
DATABASE_URL=libsql://your-db.turso.io
BETTER_AUTH_SECRET=<32-char-secret>
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

Web:
```
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
```

> Use **Turso** (libSQL) for database — SQLite files don't persist on Vercel's serverless functions.

### Option 2: Dokploy (Self-Hosted)

Best for full control on your own VPS.

```bash
# Create .env
cp apps/server/.env.example .env

# Edit .env with values, then:
docker compose up --build
```

**In Dokploy:**
1. Create a Compose project pointing to `docker-compose.yml`
2. Set environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_SERVER_URL`)
3. Configure domains (web → port 3001, server → port 3000)
4. Deploy and run `docker exec -it <container> bun drizzle-kit push`

### Environment Variables Reference

| Variable | Server | Web | Notes |
|----------|--------|-----|-------|
| `DATABASE_URL` | ✅ | | SQLite: `file:/data/prod.db` (Docker), Turso: `libsql://...` |
| `BETTER_AUTH_SECRET` | ✅ | | Min 32 characters |
| `BETTER_AUTH_URL` | ✅ | | Public server URL |
| `CORS_ORIGIN` | ✅ | | Public web URL |
| `NEXT_PUBLIC_SERVER_URL` | | ✅ | Build-time (baked into bundle) |
| `NODE_ENV` | ✅ | ✅ | `production` in deploy |

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main`:
- Type checking
- Unit tests (17 tests)
- Production build

For Vercel: connect repo in Vercel dashboard for auto-deploy.
For Dokploy: configure webhook in Dokploy dashboard.

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
- Next.js 16: React Server Components and streaming SSR
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
