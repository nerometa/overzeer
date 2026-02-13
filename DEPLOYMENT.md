# Deployment Guide

This guide covers deploying Overzeer to production environments.

## Table of Contents

- [Deployment Options](#deployment-options)
- [Environment Setup](#environment-setup)
- [Database Configuration](#database-configuration)
- [Platform-Specific Guides](#platform-specific-guides)
- [CI/CD Setup](#cicd-setup)

## Deployment Options

### Option 1: Vercel (Recommended)

Best for serverless deployment with automatic scaling.

**Pros:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Preview deployments for PRs

**Cons:**
- Serverless functions have cold starts
- SQLite requires special handling (use Turso)

### Option 2: Railway/Render

Great for traditional server deployment with persistent storage.

**Pros:**
- Persistent SQLite database
- Simple monorepo deployment
- Automatic deploys from Git

**Cons:**
- Manual SSL configuration (Render)
- Less edge caching

### Option 3: Self-Hosted (VPS)

Full control with DigitalOcean, Hetzner, or similar.

**Pros:**
- Complete control
- Cost-effective for sustained traffic
- Persistent storage

**Cons:**
- Manual setup and maintenance
- Need to configure reverse proxy

## Environment Setup

### 1. Generate Auth Secret

```bash
openssl rand -base64 32
```

### 2. Configure Environment Variables

**apps/server/.env.production:**
```bash
BETTER_AUTH_SECRET=your-generated-secret
BETTER_AUTH_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# For SQLite (simplest)
DATABASE_URL=file:./prod.db

# For Turso (recommended for serverless)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

**apps/web/.env.production:**
```bash
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/trpc
```

## Database Configuration

### Option A: SQLite (Simplest)

Good for single-instance deployments.

```bash
# Database file will be created automatically
DATABASE_URL=file:./prod.db
```

### Option B: Turso (Serverless/Edge)

Best for Vercel or Cloudflare.

1. Create database at [turso.tech](https://turso.tech)
2. Get connection URL and token
3. Update environment variables

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create overzeer

# Get connection details
turso db show overzeer
turso db tokens create overzeer
```

### Database Migrations

```bash
# Push schema to production database
cd packages/db
DATABASE_URL=your-prod-db-url bun run db:push

# Or run migrations
bun run db:migrate
```

## Platform-Specific Guides

### Vercel Deployment

#### Frontend (Web)

```bash
cd apps/web

# Install Vercel CLI
bun add -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Vercel Settings:**
- Framework: Next.js
- Build Command: `cd ../.. && bun run build`
- Output Directory: `apps/web/.next`

#### Backend (Server)

```bash
cd apps/server
vercel --prod
```

**Important:** Use Turso database with Vercel (SQLite doesn't persist).

### Railway Deployment

1. Connect GitHub repo to Railway
2. Add environment variables in Railway dashboard
3. Deploy both services:
   - Web: `apps/web`
   - Server: `apps/server`

** railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bun run start"
  }
}
```

### Self-Hosted with Docker

```dockerfile
# Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/*/package.json packages/*/

# Install dependencies
RUN bun install

# Copy source
COPY . .

# Build
RUN bun run build

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

# Copy built application
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/server/dist ./apps/server/dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

# Expose ports
EXPOSE 3000 3001

# Start command
CMD ["bun", "run", "start"]
```

Build and run:
```bash
docker build -t overzeer .
docker run -p 3000:3000 -p 3001:3001 overzeer
```

### Self-Hosted with PM2

```bash
# Install PM2
bun add -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'overzeer-server',
      script: 'apps/server/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'overzeer-web',
      script: 'bun',
      args: 'run apps/web/start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/overzeer
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /trpc {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/overzeer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## CI/CD Setup

### GitHub Actions

The repository includes a CI/CD workflow at `.github/workflows/ci.yml`.

**Required Secrets:**

For Vercel deployment, add these secrets:
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

**Manual Trigger:**

```bash
# Deploy via GitHub Actions
gh workflow run deploy.yml
```

## Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] Environment variables configured
- [ ] Database migrated and seeded
- [ ] Authentication working (test login)
- [ ] API endpoints responding correctly
- [ ] Frontend loading without errors
- [ ] Analytics charts displaying data
- [ ] CSV export working
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring dashboard accessible

## Troubleshooting

### CORS Errors

Ensure `CORS_ORIGIN` matches your frontend URL exactly (including protocol).

### Database Connection Issues

Check database URL format:
- SQLite: `file:./relative/path.db` or `file:/absolute/path.db`
- Turso: `libsql://dbname.turso.io`

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
bun run build
```

### Authentication Not Working

- Verify `BETTER_AUTH_SECRET` is set and 32+ characters
- Check `BETTER_AUTH_URL` matches your API domain
- Ensure cookies are being set (check browser dev tools)

## Performance Optimization

### Enable Compression

Vercel/Railway handle this automatically. For self-hosted:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Database Indexing

Ensure indexes are created on frequently queried columns:
- `sales.eventId`
- `sales.saleDate`
- `events.userId`

### Caching

Consider adding:
- Redis for session storage
- CDN for static assets (Cloudflare, Vercel Edge)
- Database query caching

## Support

For deployment issues:
1. Check logs: `bun run logs` or platform dashboard
2. Verify environment variables
3. Test database connectivity
4. Review application logs for errors
