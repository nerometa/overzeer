# Overzeer Deployment Guide

## Architecture

```
Browser
  │
  ▼  (single domain, HTTPS)
Frontend — Next.js — port 3001
  │
  │  /api/* requests proxied server-side
  │  over Docker internal network
  ▼
Backend — Elysia — port 3000  (no public domain needed)
  │
  └── SQLite (volume: ./backend/data)
```

**Key insight:** The frontend and backend share one public domain. All `/api/*`
requests from the browser hit the Next.js server first, which proxies them
to the backend via the Docker-internal hostname `backend:3000`. The browser
never speaks directly to the backend container.

This means:
- Only the frontend needs a public domain in Dokploy.
- The backend needs no public domain or exposed port on the internet.
- No `NEXT_PUBLIC_SERVER_URL` env var needed — client-side code uses
  relative URLs (`/api/...`) so it always hits the same origin.

---

## Dokploy Setup

### 1. Create a Compose project

Point Dokploy at `docker-compose.yml` in this repository.

### 2. Assign the domain

| Service  | Port | Domain                        |
|----------|------|-------------------------------|
| frontend | 3001 | `https://yourdomain.com` ✅   |
| backend  | 3000 | *(none — internal only)*      |

> Do **not** assign a public domain to the backend. If you do, Dokploy's
> reverse proxy will route `/api/*` requests directly to the backend,
> bypassing the Next.js proxy and breaking auth cookie handling.

### 3. Set environment variables

In Dokploy's environment variables UI (or create a `.env` from `.env.example`):

```bash
# Backend
NODE_ENV=production
SERVER_PORT=3000
DATABASE_URL=file:/app/data/local.db
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Frontend
PORT=3001
```

That's it — no other variables needed.

### 4. Deploy

```bash
docker compose up --build -d
```

### 5. Initialise the database (first deploy only)

```bash
docker exec -it overzeer-backend bun drizzle-kit push
docker exec -it overzeer-backend bun src/db/seed.ts   # optional sample data
```

---

## Environment Variables Reference

| Variable            | Service  | Purpose                                      |
|---------------------|----------|----------------------------------------------|
| `DATABASE_URL`      | backend  | SQLite path inside container                 |
| `BETTER_AUTH_SECRET`| backend  | JWT signing secret (min 32 chars)            |
| `BETTER_AUTH_URL`   | backend  | Public domain — scopes auth cookies          |
| `CORS_ORIGIN`       | backend  | Allowed browser origin (your domain)         |
| `PORT`              | frontend | Listening port (keep 3001)                   |
| `API_INTERNAL_URL`  | frontend | Set automatically in docker-compose.yml      |

`API_INTERNAL_URL` is hardcoded to `http://backend:3000` in `docker-compose.yml`
and must not be changed — `backend` is the Docker service name.

---

## How the Proxy Works

```
Browser GET /api/events
  → Frontend (Next.js) receives request
  → /api/[...slug] route handler fires
  → Fetches http://backend:3000/api/events  (Docker internal)
  → Streams response back to browser
```

The proxy at `frontend/src/app/api/[...slug]/route.ts` handles this.
It forwards all headers (including cookies) and preserves `Set-Cookie`
response headers so auth sessions work correctly.

---

## Troubleshooting

### 502 on `/api/*` endpoints
The frontend can't reach the backend container.
- Check both containers are on the `overzeer` Docker network.
- Confirm backend container is healthy: `docker logs overzeer-backend`.

### Auth redirects to wrong URL / cookies not set
`BETTER_AUTH_URL` or `CORS_ORIGIN` doesn't match your actual domain.
- Must be `https://yourdomain.com` — no trailing slash, exact match.

### Changes to domain after first deploy
Just update `BETTER_AUTH_URL` and `CORS_ORIGIN` in your env vars and
redeploy. No rebuild needed — these are runtime variables for the backend.
(Previously `NEXT_PUBLIC_SERVER_URL` required a full image rebuild because
it was baked in at build time. That variable is no longer used.)
