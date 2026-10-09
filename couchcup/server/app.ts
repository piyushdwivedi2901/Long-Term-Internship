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
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
  const crew = (req: Request) => num(req.params.crewId, 'Crew')
  const id = (req: Request, what: string) => num(req.params.id, what)
  const noContent = (res: Response) => res.sendStatus(204)

  api.get('/auth/me', (req, res) => res.json({ user: services.auth.me(uid(req)) }))
  api.patch('/auth/me', (req, res) => res.json({ user: services.auth.updateProfile(uid(req), req.body) }))
  api.delete('/auth/me', async (req, res) => {
    await services.auth.deleteAccount(uid(req), req.body)
    noContent(res)
  })

  api.get('/overview', (req, res) => res.json(services.overview(uid(req))))
  api.post('/sample', (req, res) => res.status(201).json(services.seedSample(uid(req))))

  api.post('/invites/preview', limiter, (req, res) => res.json(services.crews.previewInvite(uid(req), req.body)))
  api.post('/invites/join', limiter, (req, res) => res.json(services.crews.join(uid(req), req.body)))

  api.get('/crews', (req, res) => res.json(services.crews.list(uid(req))))
  api.post('/crews', (req, res) => res.status(201).json(services.crews.create(uid(req), req.body)))
  api.get('/crews/:crewId', (req, res) => res.json(services.crews.get(uid(req), crew(req))))
  api.patch('/crews/:crewId', (req, res) => res.json(services.crews.update(uid(req), crew(req), req.body)))
  api.delete('/crews/:crewId', (req, res) => (services.crews.remove(uid(req), crew(req)), noContent(res)))
  api.post('/crews/:crewId/invite', (req, res) => res.json(services.crews.regenerateInvite(uid(req), crew(req))))
  api.post('/crews/:crewId/leave', (req, res) => (services.crews.leave(uid(req), crew(req)), noContent(res)))
  api.get('/crews/:crewId/activity', (req, res) => res.json(services.activity(uid(req), crew(req), Number(req.query.limit ?? 30) || 30)))

  api.post('/crews/:crewId/players', (req, res) => res.status(201).json(services.players.add(uid(req), crew(req), req.body)))
  api.get('/crews/:crewId/players/:id', (req, res) => res.json(services.players.profile(uid(req), crew(req), id(req, 'Player'))))
  api.patch('/crews/:crewId/players/:id', (req, res) => res.json(services.players.update(uid(req), crew(req), id(req, 'Player'), req.body)))
  api.delete('/crews/:crewId/players/:id', (req, res) => (services.players.remove(uid(req), crew(req), id(req, 'Player')), noContent(res)))

  api.get('/crews/:crewId/competitions', (req, res) => res.json(services.competitions.list(uid(req), crew(req))))
  api.post('/crews/:crewId/competitions', (req, res) => res.status(201).json(services.competitions.create(uid(req), crew(req), req.body)))
  api.get('/competitions/:id', (req, res) => res.json(services.competitions.get(uid(req), id(req, 'Competition'))))
  api.patch('/competitions/:id', (req, res) => res.json(services.competitions.rename(uid(req), id(req, 'Competition'), req.body)))
  api.delete('/competitions/:id', (req, res) => (services.competitions.remove(uid(req), id(req, 'Competition')), noContent(res)))

  api.get('/crews/:crewId/matches', (req, res) => res.json(services.matches.list(uid(req), crew(req))))
  api.post('/crews/:crewId/friendlies', (req, res) => res.status(201).json(services.matches.friendly(uid(req), crew(req), req.body)))
  api.put('/matches/:id/result', (req, res) => res.json(services.matches.record(uid(req), id(req, 'Match'), req.body)))
  api.delete('/matches/:id/result', (req, res) => (services.matches.clear(uid(req), id(req, 'Match')), noContent(res)))

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
