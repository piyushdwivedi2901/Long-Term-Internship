import { randomBytes } from 'node:crypto'
import express from 'express'
import { hashPassword, readToken, signToken, verifyPassword } from './auth.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ jwtSecret?: string }} [options]
 */
export function createApp(db, { jwtSecret = process.env.JWT_SECRET } = {}) {
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production')
    jwtSecret = randomBytes(32).toString('hex') // dev: tokens are invalidated on restart
  }

  const app = express()
  app.use(express.json({ limit: '10kb' }))

  // Allow the Vite dev server (or any configured origin) to call the API.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // Attach req.userId when a valid token is sent; invalid tokens are a 401,
  // not a silent fall-through to the anonymous list.
  app.use((req, res, next) => {
    if (!req.headers.authorization) return next()
    const payload = readToken(req.headers.authorization, jwtSecret)
    if (!payload) return res.status(401).json({ error: 'invalid or expired token' })
    req.userId = Number(payload.sub)
    req.userEmail = payload.email
    next()
  })

  const requireAuth = (req, res, next) =>
    req.userId ? next() : res.status(401).json({ error: 'authentication required' })

  // ---------- auth ----------
  const credentials = (body) => {
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    return { email, password }
  }

  app.post('/api/auth/signup', async (req, res, next) => {
    try {
      const { email, password } = credentials(req.body)
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'a valid email is required' })
      if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
        return res.status(409).json({ error: 'email already registered' })
      }
      const hash = await hashPassword(password)
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
        .run(email, hash)
      const user = { id: Number(lastInsertRowid), email }
      res.status(201).json({ token: signToken(user, jwtSecret), user })
    } catch (err) {
      next(err)
    }
  })

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { email, password } = credentials(req.body)
      const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email)
      // Same message and a real hash comparison either way, so the response
      // doesn't reveal whether the email exists.
      const ok = row ? await verifyPassword(password, row.password_hash) : false
      if (!row || !ok) return res.status(401).json({ error: 'invalid email or password' })
      const user = { id: row.id, email: row.email }
      res.json({ token: signToken(user, jwtSecret), user })
    } catch (err) {
      next(err)
    }
  })

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: { id: req.userId, email: req.userEmail } })
  })

  // ---------- todos ----------
  // Signed-in requests only ever touch that user's rows; requests without a
  // token use the shared anonymous list from Task 35 (user_id IS NULL).
  const owner = (req) => (req.userId ? { clause: 'user_id = ?', args: [req.userId] } : { clause: 'user_id IS NULL', args: [] })
  const toTodo = (row) => ({ id: row.id, text: row.text, done: Boolean(row.done) })

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/todos', (req, res) => {
    const { clause, args } = owner(req)
    const rows = db.prepare(`SELECT id, text, done FROM todos WHERE ${clause} ORDER BY id`).all(...args)
    res.json(rows.map(toTodo))
  })

  app.post('/api/todos', (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    if (!text) return res.status(400).json({ error: 'text is required' })
    if (text.length > 200) return res.status(400).json({ error: 'text must be 200 characters or fewer' })
    const { lastInsertRowid } = db
      .prepare('INSERT INTO todos (text, user_id) VALUES (?, ?)')
      .run(text, req.userId ?? null)
    res.status(201).json({ id: Number(lastInsertRowid), text, done: false })
  })

  app.patch('/api/todos/:id', (req, res) => {
    const id = Number(req.params.id)
    const { clause, args } = owner(req)
    const row = db.prepare(`SELECT id, text, done FROM todos WHERE id = ? AND ${clause}`).get(id, ...args)
    if (!row) return res.status(404).json({ error: 'not found' })
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : row.text
    const done = typeof req.body?.done === 'boolean' ? Number(req.body.done) : row.done
    if (!text) return res.status(400).json({ error: 'text cannot be empty' })
    db.prepare('UPDATE todos SET text = ?, done = ? WHERE id = ?').run(text, done, id)
    res.json(toTodo({ id, text, done }))
  })

  app.delete('/api/todos/:id', (req, res) => {
    const { clause, args } = owner(req)
    const { changes } = db.prepare(`DELETE FROM todos WHERE id = ? AND ${clause}`).run(Number(req.params.id), ...args)
    if (!changes) return res.status(404).json({ error: 'not found' })
    res.sendStatus(204)
  })

  // Final error handler: never leak stack traces.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON' })
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'payload too large' })
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  })

  return app
}
