// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createApp } from './app.js'
import { openDb } from './db.js'
import { hashPassword, verifyPassword } from './auth.js'

const SECRET = 'test-secret'
let app
beforeEach(() => {
  app = createApp(openDb(':memory:'), { jwtSecret: SECRET })
})

const signup = (email = 'a@example.com', password = 'password123') =>
  request(app).post('/api/auth/signup').send({ email, password })

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one; salts differ', async () => {
    const [h1, h2] = await Promise.all([hashPassword('hunter22'), hashPassword('hunter22')])
    expect(h1).not.toBe(h2)
    expect(await verifyPassword('hunter22', h1)).toBe(true)
    expect(await verifyPassword('hunter23', h1)).toBe(false)
    expect(h1).not.toContain('hunter22')
  })
})

describe('signup / login / me', () => {
  it('signs up, returns a token, and /me identifies the user', async () => {
    const res = await signup('  Piyush@Example.com ')
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe('piyush@example.com')
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`)
    expect(me.body.user).toMatchObject({ email: 'piyush@example.com' })
  })

  it('validates email and password and rejects duplicates (case-insensitive)', async () => {
    expect((await signup('nope')).status).toBe(400)
    expect((await signup('a@example.com', 'short')).status).toBe(400)
    expect((await signup()).status).toBe(201)
    expect((await signup('A@EXAMPLE.COM')).status).toBe(409)
  })

  it('logs in with correct credentials only, with an identical error for both failures', async () => {
    await signup()
    const ok = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'password123' })
    expect(ok.status).toBe(200)
    const badPw = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'wrongpass1' })
    const noUser = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'password123' })
    expect(badPw.status).toBe(401)
    expect(noUser.status).toBe(401)
    expect(badPw.body).toEqual(noUser.body)
  })

  it('never stores or returns the plaintext password', async () => {
    const db = openDb(':memory:')
    const a = createApp(db, { jwtSecret: SECRET })
    const res = await request(a).post('/api/auth/signup').send({ email: 'a@example.com', password: 'password123' })
    expect(JSON.stringify(res.body)).not.toContain('password123')
    expect(db.prepare('SELECT password_hash FROM users').get().password_hash).not.toContain('password123')
  })
})

describe('token handling', () => {
  it('rejects /me without a token, with a garbage token, and with an expired token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk')).status).toBe(401)
    const expired = jwt.sign({ sub: '1', email: 'a@example.com' }, SECRET, { expiresIn: -10 })
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401)
  })

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({ sub: '1', email: 'a@example.com' }, 'other-secret')
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401)
  })
})

describe('per-user todos', () => {
  it('isolates todos between users and from the anonymous list', async () => {
    const a = (await signup('a@example.com')).body.token
    const b = (await signup('b@example.com')).body.token
    await request(app).post('/api/todos').set('Authorization', `Bearer ${a}`).send({ text: "A's todo" })
    await request(app).post('/api/todos').send({ text: 'anonymous todo' })

    const listFor = async (token) =>
      (await request(app).get('/api/todos').set(token ? { Authorization: `Bearer ${token}` } : {})).body.map((t) => t.text)
    expect(await listFor(a)).toEqual(["A's todo"])
    expect(await listFor(b)).toEqual([])
    expect(await listFor(null)).toEqual(['anonymous todo'])
  })

  it("won't let one user modify or delete another user's todo", async () => {
    const a = (await signup('a@example.com')).body.token
    const b = (await signup('b@example.com')).body.token
    const todo = (await request(app).post('/api/todos').set('Authorization', `Bearer ${a}`).send({ text: 'mine' })).body
    expect((await request(app).patch(`/api/todos/${todo.id}`).set('Authorization', `Bearer ${b}`).send({ done: true })).status).toBe(404)
    expect((await request(app).delete(`/api/todos/${todo.id}`).set('Authorization', `Bearer ${b}`)).status).toBe(404)
    expect((await request(app).delete(`/api/todos/${todo.id}`)).status).toBe(404) // anonymous either
  })
})
