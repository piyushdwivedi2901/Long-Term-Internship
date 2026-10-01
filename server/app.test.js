// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'
import { openDb } from './db.js'

let app
beforeEach(() => {
  app = createApp(openDb(':memory:'), { jwtSecret: 's' })
})

describe('todos API (SQLite)', () => {
  it('starts empty', async () => {
    const res = await request(app).get('/api/todos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('creates, lists, updates and deletes a todo', async () => {
    const created = await request(app).post('/api/todos').send({ text: '  Buy milk ' })
    expect(created.status).toBe(201)
    expect(created.body).toEqual({ id: 1, text: 'Buy milk', done: false })

    const updated = await request(app).patch('/api/todos/1').send({ done: true })
    expect(updated.body).toEqual({ id: 1, text: 'Buy milk', done: true })

    expect((await request(app).get('/api/todos')).body).toEqual([updated.body])

    expect((await request(app).delete('/api/todos/1')).status).toBe(204)
    expect((await request(app).get('/api/todos')).body).toEqual([])
  })

  it('validates input', async () => {
    expect((await request(app).post('/api/todos').send({ text: '   ' })).status).toBe(400)
    expect((await request(app).post('/api/todos').send({ text: 'x'.repeat(201) })).status).toBe(400)
    expect((await request(app).post('/api/todos').set('Content-Type', 'application/json').send('{bad')).status).toBe(400)
  })

  it('returns 404 for unknown ids', async () => {
    expect((await request(app).patch('/api/todos/99').send({ done: true })).status).toBe(404)
    expect((await request(app).delete('/api/todos/99')).status).toBe(404)
  })

  it('is not vulnerable to SQL injection via text', async () => {
    await request(app).post('/api/todos').send({ text: "x'); DROP TABLE todos; --" })
    const res = await request(app).get('/api/todos')
    expect(res.body).toHaveLength(1)
  })
})

describe('persistence', () => {
  it('survives reopening the same database file', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const file = `${mkdtempSync(`${tmpdir()}/todos-`)}/t.sqlite`
    await request(createApp(openDb(file), { jwtSecret: 's' })).post('/api/todos').send({ text: 'persist me' })
    const again = await request(createApp(openDb(file), { jwtSecret: 's' })).get('/api/todos')
    expect(again.body.map((t) => t.text)).toEqual(['persist me'])
  })
})
