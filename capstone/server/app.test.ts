// @vitest-environment node
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createServices } from '../shared/services.ts'
import { createApp } from './app.ts'
import { createSqliteRepository } from './sqliteRepository.ts'
import { jwtSigner, scryptHasher } from './security.ts'

const SECRET = 'test-secret'

function makeApp(opts: Parameters<typeof createApp>[1] = {}) {
  const repo = createSqliteRepository(':memory:')
  const services = createServices({ repo, passwords: scryptHasher, tokens: jwtSigner(SECRET) })
  return { app: createApp(services, { corsOrigins: ['http://localhost:5180'], ...opts }), repo }
}

async function signedIn(app: ReturnType<typeof makeApp>['app'], email = 'p@example.com') {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Piyush', email, password: 'password123' })
  return { token: res.body.token as string, auth: { Authorization: `Bearer ${res.body.token}` } }
}

describe('security basics', () => {
  it('hashes passwords with scrypt and never returns them', async () => {
    const { app, repo } = makeApp()
    const res = await request(app).post('/api/auth/signup').send({ name: 'P', email: 'p@example.com', password: 'password123' })
    expect(res.status).toBe(201)
    expect(JSON.stringify(res.body)).not.toMatch(/password123|passwordHash|scrypt/)
    expect(repo.users.byEmail('p@example.com')!.passwordHash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
  })

  it('verifies scrypt hashes and rejects tampered ones', async () => {
    const h = await scryptHasher.hash('hunter2hunter2')
    expect(await scryptHasher.verify('hunter2hunter2', h)).toBe(true)
    expect(await scryptHasher.verify('hunter2hunter3', h)).toBe(false)
    expect(await scryptHasher.verify('x', 'garbage')).toBe(false)
  })

  it('rejects missing, forged, expired and alg-none tokens', async () => {
    const { app } = makeApp()
    await signedIn(app)
    const forged = jwt.sign({ sub: '1' }, 'other-secret')
    const expired = jwt.sign({ sub: '1' }, SECRET, { expiresIn: -5 })
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`
    for (const header of [undefined, 'Bearer junk', `Bearer ${forged}`, `Bearer ${expired}`, `Bearer ${none}`]) {
      const res = await request(app).get('/api/projects').set(header ? { Authorization: header } : {})
      expect(res.status).toBe(401)
    }
  })

  it('sets security headers and only allows listed CORS origins', async () => {
    const { app } = makeApp()
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5180')
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5180')
    expect(ok.headers['x-content-type-options']).toBe('nosniff')
    expect(ok.headers['x-powered-by']).toBeUndefined()
    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example')
    expect(evil.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rate-limits repeated sign-in attempts', async () => {
    const { app } = makeApp({ authRateLimit: { max: 3, windowMs: 60_000 } })
    const attempt = () => request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'whatever1' })
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401)
    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect(blocked.headers['retry-after']).toBeDefined()
  })

  it('returns structured errors for bad JSON, validation and unknown routes', async () => {
    const { app } = makeApp()
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{oops')
    expect(bad.body.error.code).toBe('bad_json')
    const invalid = await request(app).post('/api/auth/signup').send({ name: '', email: 'x', password: '1' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.fields).toMatchObject({ email: 'Enter a valid email address' })
    const { auth } = await signedIn(app)
    expect((await request(app).get('/api/nope').set(auth)).status).toBe(404)
    expect((await request(app).get('/api/projects/abc').set(auth)).status).toBe(404)
  })
})

describe('full workflow over HTTP + SQLite', () => {
  it('project → tasks → move → comment → stats → activity', async () => {
    const { app } = makeApp()
    const { auth } = await signedIn(app)

    const project = (await request(app).post('/api/projects').set(auth).send({ name: 'Launch', color: 'violet' })).body
    expect(project).toMatchObject({ name: 'Launch', color: 'violet', counts: { todo: 0 } })

    const mk = (title: string, extra = {}) =>
      request(app).post('/api/tasks').set(auth).send({ projectId: project.id, title, ...extra })
    const a = (await mk('Write copy', { labels: ['content'], checklist: [{ id: 'x', text: 'Hero', done: false }] })).body
    const b = (await mk('Ship', { dueDate: '2026-01-01' })).body
    expect(a.labels).toEqual(['content'])
    expect(a.checklist).toEqual([{ id: 'x', text: 'Hero', done: false }])

    const moved = (await request(app).post(`/api/tasks/${b.id}/move`).set(auth).send({ status: 'done', index: 0 })).body
    expect(moved.status).toBe('done')
    expect(moved.completedAt).not.toBeNull()

    await request(app).post(`/api/tasks/${a.id}/comments`).set(auth).send({ body: 'On it' })
    const list = (await request(app).get('/api/tasks').query({ projectId: project.id }).set(auth)).body
    expect(list.map((t: { title: string; commentCount: number }) => [t.title, t.commentCount])).toEqual([
      ['Write copy', 1],
      ['Ship', 0],
    ])

    const stats = (await request(app).get('/api/stats').set(auth)).body
    expect(stats.total).toBe(2)
    expect(stats.counts.done).toBe(1)

    const activity = (await request(app).get('/api/activity').set(auth)).body
    expect(activity[0].summary).toBe('Commented on “Write copy”')

    expect((await request(app).delete(`/api/projects/${project.id}`).set(auth)).status).toBe(204)
    expect((await request(app).get(`/api/tasks/${a.id}`).set(auth)).status).toBe(404)
  })

  it('isolates users from each other', async () => {
    const { app } = makeApp()
    const alice = await signedIn(app, 'alice@example.com')
    const bob = await signedIn(app, 'bob@example.com')
    const p = (await request(app).post('/api/projects').set(alice.auth).send({ name: 'Private' })).body
    expect((await request(app).get('/api/projects').set(bob.auth)).body).toEqual([])
    expect((await request(app).get(`/api/projects/${p.id}`).set(bob.auth)).status).toBe(404)
    expect((await request(app).delete(`/api/projects/${p.id}`).set(bob.auth)).status).toBe(404)
  })

  it('seeds a sample workspace and deletes the account with password confirmation', async () => {
    const { app } = makeApp()
    const { auth } = await signedIn(app)
    const seeded = await request(app).post('/api/sample').set(auth).send({ today: '2026-10-09' })
    expect(seeded.body).toHaveLength(3)
    expect((await request(app).delete('/api/auth/me').set(auth).send({ password: 'nope-nope' })).status).toBe(400)
    expect((await request(app).delete('/api/auth/me').set(auth).send({ password: 'password123' })).status).toBe(204)
    expect((await request(app).get('/api/auth/me').set(auth)).status).toBe(401)
  })

  it('persists across restarts with a database file', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const file = `${mkdtempSync(`${tmpdir()}/flowboard-`)}/db.sqlite`
    const make = () => {
      const repo = createSqliteRepository(file)
      return { repo, app: createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner(SECRET) })) }
    }
    const first = make()
    const { auth } = await signedIn(first.app)
    await request(first.app).post('/api/projects').set(auth).send({ name: 'Durable' })
    first.repo.close()
    const second = make()
    const res = await request(second.app).get('/api/projects').set(auth)
    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Durable'])
    second.repo.close()
  })
})

describe('serving the built frontend', () => {
  it('serves index.html for app routes with no-cache, and hashed assets as immutable', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(`${tmpdir()}/fb-static-`)
    mkdirSync(`${dir}/assets`)
    writeFileSync(`${dir}/index.html`, '<!doctype html><title>Flowboard</title>')
    writeFileSync(`${dir}/assets/app-abc123.js`, 'console.log(1)')
    const { app } = makeApp({ staticDir: dir })
    const index = await request(app).get('/')
    expect(index.text).toContain('<title>Flowboard</title>')
    expect(index.headers['cache-control']).toBe('no-cache')
    const deep = await request(app).get('/projects/3')
    expect(deep.status).toBe(200)
    const asset = await request(app).get('/assets/app-abc123.js')
    expect(asset.headers['cache-control']).toContain('immutable')
    expect((await request(app).get('/api/nope')).status).toBe(401) // API routes never fall through to the SPA
  })
})

