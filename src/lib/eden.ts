import { treaty } from '@elysiajs/eden'
import { app, type App } from '../app/api/[[...slugs]]/route'

export const api =
  typeof window !== 'undefined'
    ? treaty<App>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').api
    : treaty(app).api

export type { App }
