import express from 'express'

/** @param {import('node:sqlite').DatabaseSync} db */
export function createApp(db) {
  const app = express()
  app.use(express.json())

  // Allow the Vite dev server (or any configured origin) to call the API.
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  const toTodo = (row) => ({ id: row.id, text: row.text, done: Boolean(row.done) })

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.get('/api/todos', (_req, res) => {
    const rows = db.prepare('SELECT id, text, done FROM todos ORDER BY id').all()
    res.json(rows.map(toTodo))
  })

  app.post('/api/todos', (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    if (!text) return res.status(400).json({ error: 'text is required' })
    if (text.length > 200) return res.status(400).json({ error: 'text must be 200 characters or fewer' })
    const { lastInsertRowid } = db.prepare('INSERT INTO todos (text) VALUES (?)').run(text)
    res.status(201).json({ id: Number(lastInsertRowid), text, done: false })
  })

  app.patch('/api/todos/:id', (req, res) => {
    const id = Number(req.params.id)
    const row = db.prepare('SELECT id, text, done FROM todos WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ error: 'not found' })
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : row.text
    const done = typeof req.body?.done === 'boolean' ? Number(req.body.done) : row.done
    if (!text) return res.status(400).json({ error: 'text cannot be empty' })
    db.prepare('UPDATE todos SET text = ?, done = ? WHERE id = ?').run(text, done, id)
    res.json(toTodo({ id, text, done }))
  })

  app.delete('/api/todos/:id', (req, res) => {
    const { changes } = db.prepare('DELETE FROM todos WHERE id = ?').run(Number(req.params.id))
    if (!changes) return res.status(404).json({ error: 'not found' })
    res.sendStatus(204)
  })

  // Final error handler: never leak stack traces.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON' })
    console.error(err)
    res.status(500).json({ error: 'internal error' })
  })

  return app
}
