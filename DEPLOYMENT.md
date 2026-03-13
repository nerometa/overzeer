# Overzeer Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HTTPS Domain                              │
│                   (overzeer.nerometa.dev)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │   Frontend (Next.js)     │
              │      Port 3001            │
              │                          │
              │   Proxies /api/*  ───────┼──────────────────┐
              │   to backend             │                  │
              └─────────────────────────┘                  │
                                                               │
                                                               ▼
                                              ┌─────────────────────────┐
                                              │   Backend (Elysia)      │
                                              │      Port 3000          │
                                              │                         │
                                              │   /api/* endpoints      │
                                              │   /api/auth/* (Better)   │
                                              └─────────────────────────┘
```

**Key Point**: Single domain points to **Frontend (port 3001)**. Frontend proxies all `/api/*` requests to backend.

---

## Environment Variables

### For Production (HTTPS Domain)

Create/edit `.env`:

```bash
# =============================================================================
# PRODUCTION CONFIGURATION
# =============================================================================

# ----------------------------------------------
# Backend (Elysia) - Port 3000
# ----------------------------------------------
NODE_ENV=production
SERVER_PORT=3000

# Database - SQLite file path (inside container)
DATABASE_URL=file:/app/data/local.db

# Better Auth - MUST be the public HTTPS URL
BETTER_AUTH_URL=https://overzeer.nerometa.dev
BETTER_AUTH_SECRET=<generate-with: openssl rand -base64 32>

# CORS - MUST be the frontend's public HTTPS URL
CORS_ORIGIN=https://overzeer.nerometa.dev

# ----------------------------------------------
# Frontend (Next.js) - Port 3001
# ----------------------------------------------
# IMPORTANT: This is baked into the bundle at build time!
# Must be the public URL that BROWSERS use to reach the backend
NEXT_PUBLIC_SERVER_URL=https://overzeer.nerometa.dev

# Internal Docker network URL - for SSR/proxy to call backend
# This is used by Next.js server-side to proxy /api/* requests
API_INTERNAL_URL=http://backend:3000

PORT=3001
```

---

## Root Cause: Why /api Returned 404

### The Problem

1. **Missing `API_INTERNAL_URL`** in docker-compose.yml
   - Frontend needs this at RUNTIME to proxy requests to backend
   - Only `NEXT_PUBLIC_SERVER_URL` was passed (at build time for the bundle)
   - The proxy route couldn't reach the backend

2. **CORS and Better Auth URLs pointing to localhost**
   - In production, these must be the public HTTPS URL

### The Fix

Update `docker-compose.yml` to include `API_INTERNAL_URL`:

```yaml
services:
  backend:
    # ... existing config ...
    environment:
      NODE_ENV: production
      DATABASE_URL: file:/app/data/local.db
      BETTER_AUTH_URL: https://overzeer.nerometa.dev
      CORS_ORIGIN: https://overzeer.nerometa.dev

  frontend:
    # ... existing config ...
    environment:
      PORT: 3001
      API_INTERNAL_URL: http://backend:3000  # ADD THIS LINE
```

---

## Domain Assignment: Where Does the Domain Go?

### Option A: Single Domain (Recommended) ✓

Assign domain to **Frontend (Next.js on port 3001)**.

| Request | Routes To |
|---------|-----------|
| `https://overzeer.nerometa.dev/*` | Frontend (Next.js) |
| `https://overzeer.nerometa.dev/api/*` | Frontend → proxies to Backend |
| `https://overzeer.nerometa.dev/api/auth/*` | Frontend → proxies to Backend → Better Auth |

**Pros**: Simple, single endpoint, all traffic encrypted end-to-end
**Cons**: Slight overhead on API calls (proxy hop)

### Option B: Two Domains (Advanced)

Assign:
- `https://overzeer.nerometa.dev` → Frontend (3001)
- `https://api.overzeer.nerometa.dev` → Backend (3000)

**Not recommended** - adds complexity with CORS, SSL certificates, and DNS.

---

## CORS Configuration Explained

```
┌─────────────┐    Request    ┌─────────────┐
│   Browser   │ ────────────→ │   Backend   │
│             │               │  (Elysia)   │
│ https://    │ ← Response ── │             │
│ overzeer.   │ (with CORS    │ CORS_ORIGIN=
│ nerometa.dev│  headers)     │ https://over...
└─────────────┘               └─────────────┘
```

**CORS_ORIGIN**: Tells backend which frontend origins are allowed to make API requests.

- **Development**: `http://localhost:3001`
- **Production**: `https://overzeer.nerometa.dev`

---

## Better Auth URL Explained

**BETTER_AUTH_URL** is used for:
1. Generating authentication URLs (login, signup, logout)
2. Redirect URLs after auth actions
3. Cookie attributes (sets `Secure` flag in production)

```
┌─────────────┐    GET /api/auth/signin    ┌─────────────┐
│   Browser   │ ──────────────────────────→│   Backend   │
│             │                             │             │
│ Redirect ←──│ (302 to sign-in page)       │ BETTER_AUTH_|
│ to /sign-in│                             │ URL=https://|
└─────────────┘                             │ overzeer... │
                                            └─────────────┘
```

**Must match**: The URL users see in their browser address bar when using the app.

---

## Deployment Checklist

### Before Deploying

- [ ] Generate BETTER_AUTH_SECRET: `openssl rand -base64 32`
- [ ] Set correct URLs (replace `overzeer.nerometa.dev` with your actual domain)
- [ ] Update docker-compose.yml with `API_INTERNAL_URL`

### Docker Compose Changes

```yaml
# docker-compose.yml - Add API_INTERNAL_URL to frontend
services:
  frontend:
    # ... existing config ...
    environment:
      PORT: 3001
      API_INTERNAL_URL: http://backend:3000  # ADD THIS
```

### Verify After Deployment

1. **Health check**: `curl https://overzeer.nerometa.dev/api/me`
   - Should return auth error (not 404)
   
2. **Auth check**: `curl https://overzeer.nerometa.dev/api/auth/get-session`
   - Should return session data or null

3. **CORS check**: Inspect response headers for `Access-Control-Allow-Origin`

---

## Quick Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `BETTER_AUTH_URL` | Public auth base URL | `https://overzeer.nerometa.dev` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://overzeer.nerometa.dev` |
| `NEXT_PUBLIC_SERVER_URL` | Backend URL (browsers call this) | `https://overzeer.nerometa.dev` |
| `API_INTERNAL_URL` | Backend URL (server proxies) | `http://backend:3000` |

---

## Troubleshooting

### 404 on /api/* endpoints

**Cause**: Frontend can't proxy to backend
**Fix**: 
1. Check `API_INTERNAL_URL` is set in frontend container
2. Check `NEXT_PUBLIC_SERVER_URL` is correct
3. Verify backend container is running and healthy

### CORS Errors

**Cause**: CORS_ORIGIN doesn't match frontend URL
**Fix**: Set `CORS_ORIGIN=https://your-domain` (no trailing slash)

### Auth Redirects Wrong

**Cause**: BETTER_AUTH_URL points to localhost or wrong domain
**Fix**: Set `BETTER_AUTH_URL=https://your-domain`
