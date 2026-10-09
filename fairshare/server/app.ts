import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { AppError, notFound } from '../shared/errors.ts'
import type { Services } from '../shared/services.ts'

export interface AppOptions {
  corsOrigins?: string[]
  staticDir?: string
  /** Max sign-in / sign-up / invite-code attempts per IP per window. */
  sensitiveRateLimit?: { max: number; windowMs: number }
}

function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; reset: number }>()
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const e = hits.get(key)
    if (!e || e.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs })
      return next()
    }
    if (++e.count > max) {
      res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)))
      return next(new AppError(429, 'rate_limited', 'Too many attempts. Wait a few minutes and try again.'))
    }
    next()
  }
}

const num = (raw: unknown, what: string) => {
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) throw notFound(what)
  return n
}

export function createApp(services: Services, options: AppOptions = {}) {
  const { corsOrigins = [], staticDir, sensitiveRateLimit = { max: 30, windowMs: 15 * 60_000 } } = options
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
    })
    next()
  })
  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && corsOrigins.includes(origin)) {
      res.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        Vary: 'Origin',
      })
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use('/api', express.json({ limit: '64kb' }), (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  const api = express.Router()
  const limiter = rateLimit(sensitiveRateLimit)

  api.get('/health', (_req, res) => res.json({ ok: true }))
  api.post('/auth/signup', limiter, async (req, res) => res.status(201).json(await services.auth.signup(req.body)))
  api.post('/auth/login', limiter, async (req, res) => res.json(await services.auth.login(req.body)))

  api.use((req, _res, next) => {
    const h = req.headers.authorization
    ;(req as Request & { userId: number }).userId = services.auth.authenticate(h?.startsWith('Bearer ') ? h.slice(7) : null)
    next()
  })
  const uid = (req: Request) => (req as Request & { userId: number }).userId
  const gid = (req: Request) => num(req.params.groupId, 'Group')

  api.get('/auth/me', (req, res) => res.json({ user: services.auth.me(uid(req)) }))
  api.patch('/auth/me', (req, res) => res.json({ user: services.auth.updateProfile(uid(req), req.body) }))
  api.delete('/auth/me', async (req, res) => {
    await services.auth.deleteAccount(uid(req), req.body)
    res.sendStatus(204)
  })

  api.get('/overview', (req, res) => res.json(services.overview(uid(req))))
  api.post('/sample', (req, res) => res.status(201).json(services.seedSample(uid(req), req.body?.today)))

  api.post('/invites/preview', limiter, (req, res) => res.json(services.groups.previewInvite(uid(req), req.body)))
  api.post('/invites/join', limiter, (req, res) => res.json(services.groups.join(uid(req), req.body)))

  api.get('/groups', (req, res) => res.json(services.groups.list(uid(req))))
  api.post('/groups', (req, res) => res.status(201).json(services.groups.create(uid(req), req.body)))
  api.get('/groups/:groupId', (req, res) => res.json(services.groups.get(uid(req), gid(req))))
  api.patch('/groups/:groupId', (req, res) => res.json(services.groups.update(uid(req), gid(req), req.body)))
  api.delete('/groups/:groupId', (req, res) => {
    services.groups.remove(uid(req), gid(req))
    res.sendStatus(204)
  })
  api.post('/groups/:groupId/invite', (req, res) => res.json(services.groups.regenerateInvite(uid(req), gid(req))))
  api.post('/groups/:groupId/leave', (req, res) => {
    services.groups.leave(uid(req), gid(req))
    res.sendStatus(204)
  })

  api.post('/groups/:groupId/members', (req, res) => res.status(201).json(services.members.add(uid(req), gid(req), req.body)))
  api.patch('/groups/:groupId/members/:id', (req, res) =>
    res.json(services.members.rename(uid(req), gid(req), num(req.params.id, 'Person'), req.body)),
  )
  api.delete('/groups/:groupId/members/:id', (req, res) => {
    services.members.remove(uid(req), gid(req), num(req.params.id, 'Person'))
    res.sendStatus(204)
  })

  api.get('/groups/:groupId/expenses', (req, res) => res.json(services.expenses.list(uid(req), gid(req))))
  api.post('/groups/:groupId/expenses', (req, res) => res.status(201).json(services.expenses.create(uid(req), gid(req), req.body)))
  api.patch('/groups/:groupId/expenses/:id', (req, res) =>
    res.json(services.expenses.update(uid(req), gid(req), num(req.params.id, 'Expense'), req.body)),
  )
  api.delete('/groups/:groupId/expenses/:id', (req, res) => {
    services.expenses.remove(uid(req), gid(req), num(req.params.id, 'Expense'))
    res.sendStatus(204)
  })

  api.get('/groups/:groupId/settlements', (req, res) => res.json(services.settlements.list(uid(req), gid(req))))
  api.post('/groups/:groupId/settlements', (req, res) => res.status(201).json(services.settlements.create(uid(req), gid(req), req.body)))
  api.delete('/groups/:groupId/settlements/:id', (req, res) => {
    services.settlements.remove(uid(req), gid(req), num(req.params.id, 'Payment'))
    res.sendStatus(204)
  })

  api.get('/groups/:groupId/insights', (req, res) => res.json(services.insights(uid(req), gid(req), String(req.query.today ?? ''))))
  api.get('/groups/:groupId/activity', (req, res) => res.json(services.activity(uid(req), gid(req), Number(req.query.limit ?? 30) || 30)))

  api.use((_req, _res, next) => next(new AppError(404, 'not_found', 'No such endpoint')))
  app.use('/api', api)

  if (staticDir && existsSync(staticDir)) {
    app.use(
      express.static(staticDir, {
        setHeaders(res, file) {
          res.set('Cache-Control', /[\\/]assets[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache')
        },
      }),
    )
    app.get(/^(?!\/api).*/, (_req, res) => res.set('Cache-Control', 'no-cache').sendFile('index.html', { root: staticDir }))
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next
    if (err instanceof AppError) return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } })
    const e = err as { type?: string }
    if (e?.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'bad_json', message: 'The request body is not valid JSON' } })
    if (e?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'The request is too large' } })
    console.error(err)
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side. Try again.' } })
  })

  return app
}
