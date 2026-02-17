# Environment Variables Reference

## Port Configuration

| Service | Port | Config Location |
|---------|------|-----------------|
| Backend (Elysia) | 3000 | `backend/src/env.ts` → `SERVER_PORT` |
| Frontend (Next.js) | 3001 | `docker-compose.yml` → `environment.PORT` |

## Variable Usage Matrix

### Backend Variables (runtime)

| Variable | Used In | Purpose |
|----------|---------|---------|
| `SERVER_PORT` | `backend/src/env.ts` | Port Elysia listens on (default: 3000) |
| `DATABASE_URL` | `backend/src/db/index.ts` | SQLite database file path |
| `BETTER_AUTH_SECRET` | `backend/src/auth.ts` | Auth encryption key (min 32 chars) |
| `BETTER_AUTH_URL` | `backend/src/auth.ts` | Auth callback URL (backend URL) |
| `CORS_ORIGIN` | `backend/src/index.ts` | Allowed frontend origin |
| `NODE_ENV` | `backend/src/env.ts` | development/production/test |

### Frontend Variables

| Variable | Type | Used In | Purpose |
|----------|------|---------|---------|
| `NEXT_PUBLIC_SERVER_URL` | **BUILD-time** | `frontend/src/lib/api.ts` | API base URL (must be backend URL) |
| `PORT` | **Runtime** | `docker-compose.yml` | Port Next.js listens on (3001) |

## Important Notes

### 1. NEXT_PUBLIC_* variables are BUILD-time only
- `NEXT_PUBLIC_SERVER_URL` is baked into the frontend at **build time**
- It CANNOT be changed at runtime
- Docker compose passes it as a build arg

### 2. Port assignments
- **Backend container**: Listens on 3000, mapped to host 3000
- **Frontend container**: Listens on 3001 (via PORT env), mapped to host 3001

### 3. URL Flow
```
Browser → http://localhost:3001 (Frontend)
    ↓
Frontend fetches → http://localhost:3000 (Backend)
    ↓
Backend responds with data
```

### 4. Docker vs Local Development

**Docker:**
- Frontend calls backend via `http://localhost:3000` (host network)
- Backend CORS allows `http://localhost:3001`

**Local (bun run dev):**
- Same URLs work because ports are the same

## Quick Fix Checklist

If services run on wrong ports:

1. Check `.env` has correct URLs:
   ```bash
   BETTER_AUTH_URL=http://localhost:3000  # Backend
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000  # Backend (frontend calls this)
   ```

2. Check `docker-compose.yml` has PORT for frontend:
   ```yaml
   environment:
     PORT: 3001
   ```

3. Rebuild after env changes:
   ```bash
   docker compose down
   docker compose up --build
   ```
