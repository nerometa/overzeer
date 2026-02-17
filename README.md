# Overzeer

Centralized analytics hub for event ticket sales across multiple platforms. Aggregates data from Megatix, Ticketmelon, Resident Advisor, and manual at-door entries into a unified dashboard with real-time revenue projections and performance metrics.

Built with Next.js 16, Elysia, Drizzle ORM, SQLite, Better Auth, and Bun.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TailwindCSS 4, shadcn/ui |
| Backend | Elysia (REST API), Bun runtime |
| Database | SQLite, Drizzle ORM |
| Auth | Better Auth |
| Deployment | Docker Compose |
| Language | TypeScript |

## Quick Start (Docker)

```bash
# Copy environment file
cp .env.example .env

# Build and start all services
docker-compose up --build

# Initialize database (first time only)
docker-compose exec backend bun run db:push
docker-compose exec backend bun run db:seed
```

Access the app at http://localhost:3001

## Development

**Prerequisites:** [Bun](https://bun.sh/) v1.3+

```bash
# Install backend dependencies
cd backend && bun install

# Install frontend dependencies
cd frontend && bun install

# Start backend (Terminal 1)
cd backend && bun run dev

# Start frontend (Terminal 2)
cd frontend && bun run dev
```

| Service | URL |
|---------|-----|
| Web (Next.js) | http://localhost:3001 |
| Server (Elysia) | http://localhost:3000 |
| API | http://localhost:3000/api |

## Project Structure

```
overzeer/
├── backend/              # Elysia REST API
│   ├── src/
│   │   ├── index.ts      # Server entry
│   │   ├── routes/       # API routes (events, sales, analytics)
│   │   ├── services/     # Business logic
│   │   ├── db/           # Drizzle schema & connection
│   │   └── middleware/   # Auth middleware
│   ├── data/             # SQLite database
│   └── Dockerfile
├── frontend/             # Next.js 16 frontend
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   └── lib/api.ts    # REST API client
│   └── Dockerfile
├── docker-compose.yml    # One-command deployment
└── .env.example          # Environment template
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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET, POST | List / Create events |
| `/api/events/:id` | GET, PATCH, DELETE | Get / Update / Delete event |
| `/api/sales?eventId=x` | GET, POST | List / Create sales |
| `/api/sales/:id` | PATCH, DELETE | Update / Delete sale |
| `/api/platforms` | GET | List ticket platforms |
| `/api/analytics/revenue?eventId=x` | GET | Revenue breakdown |
| `/api/analytics/velocity?eventId=x` | GET | Sales velocity |
| `/api/analytics/projections?eventId=x` | GET | Projections |
| `/api/dashboard` | GET | Dashboard overview |
| `/api/auth/*` | ALL | Better Auth endpoints |

## Environment Variables

**`.env`:**
```bash
# Backend
NODE_ENV=development
SERVER_PORT=3000
DATABASE_URL=file:./backend/data/local.db
BETTER_AUTH_SECRET=your-secret-here-min-32-characters
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Frontend
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## License

MIT
