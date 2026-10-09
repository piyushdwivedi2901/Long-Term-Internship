import express, { type NextFunction, type Request, type Response } from 'express'
import { existsSync } from 'node:fs'
import { AppError, notFound } from '../shared/errors.ts'
import type { Services } from '../shared/services.ts'

export interface AppOptions {
  corsOrigins?: string[]
  staticDir?: string
  /** Max sign-in / sign-up attempts per IP per window. */
  sensitiveRateLimit?: { max: number; windowMs: number }
  /** Max uploads per signed-in user per window. */
  uploadRateLimit?: { max: number; windowMs: number }
}

function rateLimit({ max, windowMs }: { max: number; windowMs: number }, keyOf: (req: Request) => string) {
  const hits = new Map<string, { count: number; reset: number }>()
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyOf(req)
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

/** RFC 6266 filename for any (non-ASCII) name. */
const contentDisposition = (name: string) => `inline; filename="${name.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`

export function createApp(services: Services, options: AppOptions = {}) {
  const {
    corsOrigins = [],
    staticDir,
    sensitiveRateLimit = { max: 30, windowMs: 15 * 60_000 },
    uploadRateLimit = { max: 60, windowMs: 10 * 60_000 },
  } = options
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
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

  // Bills arrive as base64 JSON, so only the upload route accepts a large body.
  const smallJson = express.json({ limit: '64kb' })
  const uploadJson = express.json({ limit: '6mb' })
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    return (req.method === 'POST' && /^\/items\/\d+\/files\/?$/.test(req.path) ? uploadJson : smallJson)(req, res, next)
  })

  const api = express.Router()
  const ipLimiter = rateLimit(sensitiveRateLimit, (req) => req.ip ?? 'unknown')

  api.get('/health', (_req, res) => res.json({ ok: true }))
  api.post('/auth/signup', ipLimiter, async (req, res) => res.status(201).json(await services.auth.signup(req.body)))
  api.post('/auth/login', ipLimiter, async (req, res) => res.json(await services.auth.login(req.body)))

  api.use((req, _res, next) => {
    const h = req.headers.authorization
    ;(req as Request & { userId: number }).userId = services.auth.authenticate(h?.startsWith('Bearer ') ? h.slice(7) : null)
    next()
  })
  const uid = (req: Request) => (req as Request & { userId: number }).userId
  const today = (req: Request) => req.query.today ?? req.body?.today
  const id = (req: Request, what: string) => num(req.params.id, what)
  const uploadLimiter = rateLimit(uploadRateLimit, (req) => `u${uid(req)}`)

  api.get('/auth/me', (req, res) => res.json({ user: services.auth.me(uid(req)) }))
  api.patch('/auth/me', (req, res) => res.json({ user: services.auth.updateProfile(uid(req), req.body) }))
  api.delete('/auth/me', async (req, res) => {
    await services.auth.deleteAccount(uid(req), req.body)
    res.sendStatus(204)
  })

  api.get('/dashboard', (req, res) => res.json(services.dashboard(uid(req), today(req))))
  api.get('/export', (req, res) => res.json(services.exportAll(uid(req), today(req))))
  api.post('/sample', (req, res) => res.status(201).json(services.seedSample(uid(req), today(req))))

  api.get('/items', (req, res) => res.json(services.items.list(uid(req), today(req))))
  api.post('/items', (req, res) => res.status(201).json(services.items.create(uid(req), req.body, req.query.today)))
  api.get('/items/:id', (req, res) => res.json(services.items.get(uid(req), id(req, 'Item'), today(req))))
  api.patch('/items/:id', (req, res) => res.json(services.items.update(uid(req), id(req, 'Item'), req.body, req.query.today)))
  api.delete('/items/:id', (req, res) => {
    services.items.remove(uid(req), id(req, 'Item'))
    res.sendStatus(204)
  })

  api.post('/items/:id/files', uploadLimiter, (req, res) => res.status(201).json(services.files.add(uid(req), id(req, 'Item'), req.body)))
  api.get('/files/:id', (req, res) => {
    const f = services.files.get(uid(req), id(req, 'File'))
    res.set({
      'Content-Type': f.mime,
      'Content-Disposition': contentDisposition(f.name),
      // A stored PDF must never run script on this origin.
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
      'Cache-Control': 'private, no-store',
    })
    res.send(Buffer.from(f.data, 'base64'))
  })
  api.delete('/files/:id', (req, res) => {
    services.files.remove(uid(req), id(req, 'File'))
    res.sendStatus(204)
  })

  api.post('/items/:id/claims', (req, res) => res.status(201).json(services.claims.create(uid(req), id(req, 'Item'), req.body, req.query.today)))
  api.patch('/claims/:id', (req, res) => res.json(services.claims.update(uid(req), id(req, 'Repair'), req.body, req.query.today)))
  api.delete('/claims/:id', (req, res) => {
    services.claims.remove(uid(req), id(req, 'Repair'))
    res.sendStatus(204)
  })

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
    if (e?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'too_large', message: 'That file is too large. Files can be up to 4 MB.' } })
    console.error(err)
    res.status(500).json({ error: { code: 'internal', message: 'Something went wrong on our side. Try again.' } })
  })

  return app
}
