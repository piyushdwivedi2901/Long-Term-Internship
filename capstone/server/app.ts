import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { AppError, notFound } from '../shared/errors.ts'
import type { Services } from '../shared/services.ts'

export interface AppOptions {
  /** Comma-separated allowed origins for CORS (e.g. the Vite dev server). */
  corsOrigins?: string[]
  /** Serve the built frontend from this folder (single-service deploy). */
  staticDir?: string
  /** Max auth attempts per IP per window (sign-in / sign-up). */
  authRateLimit?: { max: number; windowMs: number }
}

type Authed = Request & { userId: number }

/** Simple fixed-window limiter, in memory (one process). */
function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; reset: number }>()
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs })
      return next()
    }
    if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)))
      return next(new AppError(429, 'rate_limited', 'Too many attempts. Wait a few minutes and try again.'))
    }
    next()
  }
}

const id = (raw: unknown, what: string) => {
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) throw notFound(what)
  return n
}

export function createApp(services: Services, options: AppOptions = {}) {
  const { corsOrigins = [], staticDir, authRateLimit = { max: 30, windowMs: 15 * 60_000 } } = options
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  // Security headers
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
    })
    next()
  })

  // CORS for an explicit allow-list only
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && (corsOrigins.includes(origin) || corsOrigins.includes('*'))) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      })
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.use('/api', express.json({ limit: '64kb' }))
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  const api = express.Router()
  const limiter = rateLimit(authRateLimit)

  api.get('/health', (_req, res) => res.json({ ok: true }))

  api.post('/auth/signup', limiter, async (req, res) => res.status(201).json(await services.auth.signup(req.body)))
  api.post('/auth/login', limiter, async (req, res) => res.json(await services.auth.login(req.body)))

  // Everything below requires a valid bearer token.
  api.use((req, _res, next) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    ;(req as Authed).userId = services.auth.authenticate(token)
    next()
  })
  const uid = (req: Request) => (req as Authed).userId

  api.get('/auth/me', (req, res) => res.json({ user: services.auth.me(uid(req)) }))
  api.patch('/auth/me', (req, res) => res.json({ user: services.auth.updateProfile(uid(req), req.body) }))
  api.delete('/auth/me', async (req, res) => {
    await services.auth.deleteAccount(uid(req), req.body)
    res.sendStatus(204)
  })

  api.get('/projects', (req, res) => res.json(services.projects.list(uid(req))))
  api.post('/projects', (req, res) => res.status(201).json(services.projects.create(uid(req), req.body)))
  api.get('/projects/:id', (req, res) => res.json(services.projects.get(uid(req), id(req.params.id, 'Project'))))
  api.patch('/projects/:id', (req, res) => res.json(services.projects.update(uid(req), id(req.params.id, 'Project'), req.body)))
  api.delete('/projects/:id', (req, res) => {
    services.projects.remove(uid(req), id(req.params.id, 'Project'))
    res.sendStatus(204)
  })

  api.get('/tasks', (req, res) => res.json(services.tasks.list(uid(req), req.query)))
  api.post('/tasks', (req, res) => res.status(201).json(services.tasks.create(uid(req), req.body)))
  api.get('/tasks/:id', (req, res) => res.json(services.tasks.get(uid(req), id(req.params.id, 'Task'))))
  api.patch('/tasks/:id', (req, res) => res.json(services.tasks.update(uid(req), id(req.params.id, 'Task'), req.body)))
  api.post('/tasks/:id/move', (req, res) => res.json(services.tasks.move(uid(req), id(req.params.id, 'Task'), req.body)))
  api.delete('/tasks/:id', (req, res) => {
    services.tasks.remove(uid(req), id(req.params.id, 'Task'))
    res.sendStatus(204)
  })

  api.get('/tasks/:id/comments', (req, res) => res.json(services.comments.list(uid(req), id(req.params.id, 'Task'))))
  api.post('/tasks/:id/comments', (req, res) =>
    res.status(201).json(services.comments.add(uid(req), id(req.params.id, 'Task'), req.body)),
  )
  api.delete('/comments/:id', (req, res) => {
    services.comments.remove(uid(req), id(req.params.id, 'Comment'))
    res.sendStatus(204)
  })

  api.get('/activity', (req, res) => res.json(services.activity.list(uid(req), Number(req.query.limit ?? 20) || 20)))
  api.get('/stats', (req, res) => res.json(services.stats(uid(req), String(req.query.today ?? ''))))
  api.post('/sample', (req, res) => res.status(201).json(services.seedSample(uid(req), req.body?.today)))

  api.use((_req, _res, next) => next(new AppError(404, 'not_found', 'No such endpoint')))
  app.use('/api', api)

  if (staticDir && existsSync(staticDir)) {
    // Hashed assets never change → cache for a year. index.html must always be
    // revalidated, or browsers keep pointing at chunks from an old deploy.
    app.use(
      express.static(staticDir, {
        index: 'index.html',
        setHeaders(res, file) {
          res.set('Cache-Control', /[\\/]assets[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache')
        },
      }),
    )
    app.get(/^(?!\/api).*/, (_req, res) => res.set('Cache-Control', 'no-cache').sendFile('index.html', { root: staticDir }))
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } })
    }
    const e = err as { type?: string; status?: number }
    if (e?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'bad_json', message: 'The request body is not valid JSON' } })
    }
    if (e?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'too_large', message: 'The request is too large' } })
    }
    console.error(err)
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side. Try again.' } })
  })

  return app
}
