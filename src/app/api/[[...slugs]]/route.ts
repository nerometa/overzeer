import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { rateLimit } from 'elysia-rate-limit'
import { auth } from '../../../server/auth'
import { env } from '../../../server/env'
import { authMiddleware, requireAuth } from '../../../server/middleware/auth'
import { eventsRoutes } from '../../../server/routes/events'
import { salesRoutes } from '../../../server/routes/sales'
import { platformsRoutes } from '../../../server/routes/platforms'
import { analyticsRoutes } from '../../../server/routes/analytics'
import { dashboardRoutes } from '../../../server/routes/dashboard'

export const dynamic = 'force-dynamic'

export const app = new Elysia({ prefix: '/api' })
  .use(
    rateLimit({
      max: 100,
      duration: 60000,
    }),
  )
  .use(
    cors({
      origin: env.NODE_ENV === 'development' ? env.CORS_ORIGIN || 'http://localhost:3001' : '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  )
  .onBeforeHandle(({ set }) => {
    set.headers['X-Content-Type-Options'] = 'nosniff'
    set.headers['X-Frame-Options'] = 'DENY'
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    set.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
  })
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error)

    if (code === 'VALIDATION') {
      set.status = 400
      return {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Invalid request',
      }
    }

    if (code === 'NOT_FOUND') {
      set.status = 404
      return {
        error: 'Not found',
        message: error instanceof Error ? error.message : 'Resource not found',
      }
    }

    set.status = 500
    return {
      error: 'Internal server error',
      message:
        env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : 'Something went wrong',
    }
  })
  .mount('/api/auth', auth.handler)
  .use(authMiddleware)
  .get('/me', ({ session, set }) => {
    const userSession = requireAuth(session, set)
    if (!userSession) return { error: 'Unauthorized' }
    return { user: userSession.user }
  })
  .group(
    '/',
    (app) =>
      app
        .use(eventsRoutes)
        .use(salesRoutes)
        .use(platformsRoutes)
        .use(analyticsRoutes)
        .use(dashboardRoutes),
  )
  .get('/', () => ({ message: 'Overzeer API v2.0', status: 'ok' }))
  .get('/health', () => ({ status: 'healthy' }))

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const PATCH = app.fetch
export const DELETE = app.fetch

export type App = typeof app
