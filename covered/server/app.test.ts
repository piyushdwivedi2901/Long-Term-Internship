// @vitest-environment node
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createServices } from '../shared/services.ts'
import { createApp } from './app.ts'
import { jwtSigner, scryptHasher } from './security.ts'
import { createSqliteRepository } from './sqliteRepository.ts'

const SECRET = 'test-secret'
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function makeApp(opts: Parameters<typeof createApp>[1] = {}) {
  const repo = createSqliteRepository()
  const services = createServices({ repo, passwords: scryptHasher, tokens: jwtSigner(SECRET), now: () => new Date('2026-10-09T09:00:00Z') })
  return createApp(services, opts)
}

async function signup(app: ReturnType<typeof makeApp>, email = 'piyush@example.com') {
  const res = await request(app).post('/api/auth/signup').send({ name: 'Piyush', email, password: 'password123' }).expect(201)
  return `Bearer ${res.body.token as string}`
}

const item = {
  name: 'Living room AC',
  brand: 'Voltas',
  category: 'appliances',
  purchaseDate: '2025-11-03',
  price: 4_299_000,
  support: { phone: '1800 000 000', website: 'https://example.com/support' },
  coverages: [
    { kind: 'standard', label: 'Standard', months: 12, provider: 'Voltas' },
    { kind: 'component', label: 'Compressor', months: 60, provider: 'Voltas' },
  ],
}

describe('Covered API (Express + SQLite)', () => {
  it('runs the whole item lifecycle', async () => {
    const app = makeApp()
    const auth = await signup(app)

    const created = await request(app).post('/api/items?today=2026-10-09').set('Authorization', auth).send(item).expect(201)
    expect(created.body).toMatchObject({ status: 'expiring', coveredUntil: '2026-11-02', daysLeft: 24 })
    const id = created.body.id as number

    const list = await request(app).get('/api/items?today=2026-10-09').set('Authorization', auth).expect(200)
    expect(list.body).toHaveLength(1)

    const updated = await request(app).patch(`/api/items/${id}`).set('Authorization', auth).send({ ...item, coverages: [...item.coverages, { kind: 'extended', label: 'Extended', months: 12, provider: 'Croma' }] }).expect(200)
    expect(updated.body).toMatchObject({ status: 'covered', coveredUntil: '2027-11-02' })

    const claim = await request(app).post(`/api/items/${id}/claims`).set('Authorization', auth).send({ date: '2026-09-01', issue: 'Leaking water', status: 'open' }).expect(201)
    await request(app).patch(`/api/claims/${claim.body.id}`).set('Authorization', auth).send({ date: '2026-09-01', issue: 'Leaking water', status: 'resolved', underWarranty: true }).expect(200)

    const dash = await request(app).get('/api/dashboard?today=2026-10-09').set('Authorization', auth).expect(200)
    expect(dash.body).toMatchObject({ itemCount: 1, repairs: { count: 1, underWarranty: 1 } })

    await request(app).delete(`/api/items/${id}`).set('Authorization', auth).expect(204)
    await request(app).get(`/api/items/${id}`).set('Authorization', auth).expect(404)
  })

  it('stores bills as real bytes and serves them back safely', async () => {
    const app = makeApp()
    const auth = await signup(app)
    const { body: it1 } = await request(app).post('/api/items').set('Authorization', auth).send(item).expect(201)
    const { body: file } = await request(app).post(`/api/items/${it1.id}/files`).set('Authorization', auth).send({ name: 'बिल March.png', mime: 'image/png', data: PNG }).expect(201)
    expect(file).toMatchObject({ size: 68, mime: 'image/png' })

    const res = await request(app).get(`/api/files/${file.id}`).set('Authorization', auth).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = []
      r.on('data', (c: Buffer) => chunks.push(c))
      r.on('end', () => cb(null, Buffer.concat(chunks)))
    }).expect(200)
    expect(res.headers['content-type']).toBe('image/png')
    expect(res.headers['content-security-policy']).toContain('sandbox')
    expect(res.headers['content-disposition']).toContain("filename*=UTF-8''%E0%A4%AC")
    expect((res.body as Buffer).toString('base64')).toBe(PNG)

    // Lists never carry the file contents.
    const detail = await request(app).get(`/api/items/${it1.id}`).set('Authorization', auth).expect(200)
    expect(JSON.stringify(detail.body)).not.toContain(PNG.slice(0, 20))

    await request(app).post(`/api/items/${it1.id}/files`).set('Authorization', auth).send({ name: 'x.pdf', mime: 'application/pdf', data: PNG }).expect(400)
    await request(app).delete(`/api/files/${file.id}`).set('Authorization', auth).expect(204)
  })

  it('accepts uploads up to 4 MB but keeps every other body small', async () => {
    const app = makeApp()
    const auth = await signup(app)
    const { body: it1 } = await request(app).post('/api/items').set('Authorization', auth).send(item).expect(201)
    const big = Buffer.alloc(3 * 1024 * 1024)
    Buffer.from(PNG, 'base64').copy(big)
    await request(app).post(`/api/items/${it1.id}/files`).set('Authorization', auth).send({ name: 'scan.png', mime: 'image/png', data: big.toString('base64') }).expect(201)
    const res = await request(app).post('/api/items').set('Authorization', auth).send({ ...item, notes: 'x'.repeat(100_000) }).expect(413)
    expect(res.body.error.code).toBe('too_large')
  })

  it('keeps accounts apart', async () => {
    const app = makeApp()
    const a = await signup(app)
    const b = await signup(app, 'aisha@example.com')
    const { body: mine } = await request(app).post('/api/items').set('Authorization', a).send(item).expect(201)
    const { body: file } = await request(app).post(`/api/items/${mine.id}/files`).set('Authorization', a).send({ name: 'b.png', mime: 'image/png', data: PNG }).expect(201)
    await request(app).get(`/api/items/${mine.id}`).set('Authorization', b).expect(404)
    await request(app).get(`/api/files/${file.id}`).set('Authorization', b).expect(404)
    await request(app).delete(`/api/items/${mine.id}`).set('Authorization', b).expect(404)
    expect((await request(app).get('/api/items').set('Authorization', b).expect(200)).body).toEqual([])
  })

  it('rejects missing, forged, expired and alg:none tokens', async () => {
    const app = makeApp()
    await signup(app)
    await request(app).get('/api/items').expect(401)
    await request(app).get('/api/items').set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, 'wrong-secret')}`).expect(401)
    await request(app).get('/api/items').set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, SECRET, { expiresIn: -10 })}`).expect(401)
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`
    await request(app).get('/api/items').set('Authorization', `Bearer ${none}`).expect(401)
  })

  it('validates input with field-level messages', async () => {
    const app = makeApp()
    const auth = await signup(app)
    const res = await request(app).post('/api/items').set('Authorization', auth).send({ ...item, purchaseDate: '2026-13-01', name: '' }).expect(400)
    expect(res.body.error.fields).toMatchObject({ name: expect.stringContaining('What is it'), purchaseDate: expect.any(String) })
    await request(app).post('/api/items').set('Authorization', auth).set('Content-Type', 'application/json').send('{oops').expect(400)
  })

  it('rate-limits sign-in attempts and uploads', async () => {
    const app = makeApp({ sensitiveRateLimit: { max: 3, windowMs: 60_000 }, uploadRateLimit: { max: 1, windowMs: 60_000 } })
    const auth = await signup(app)
    for (let i = 0; i < 2; i++) await request(app).post('/api/auth/login').send({ email: 'piyush@example.com', password: 'wrong-pass' }).expect(401)
    const res = await request(app).post('/api/auth/login').send({ email: 'piyush@example.com', password: 'password123' }).expect(429)
    expect(res.headers['retry-after']).toBeDefined()
    const { body: it1 } = await request(app).post('/api/items').set('Authorization', auth).send(item).expect(201)
    await request(app).post(`/api/items/${it1.id}/files`).set('Authorization', auth).send({ name: 'a.png', mime: 'image/png', data: PNG }).expect(201)
    await request(app).post(`/api/items/${it1.id}/files`).set('Authorization', auth).send({ name: 'b.png', mime: 'image/png', data: PNG }).expect(429)
  })

  it('seeds sample data, exports it, and sends security headers', async () => {
    const app = makeApp()
    const auth = await signup(app)
    const seeded = await request(app).post('/api/sample').set('Authorization', auth).send({ today: '2026-10-09' }).expect(201)
    expect(seeded.body).toHaveLength(10)
    const backup = await request(app).get('/api/export').set('Authorization', auth).expect(200)
    expect(backup.body.items).toHaveLength(10)
    expect(backup.headers['x-content-type-options']).toBe('nosniff')
    expect(backup.headers['x-frame-options']).toBe('DENY')
    expect(backup.headers['cache-control']).toBe('no-store')
    expect(backup.headers['x-powered-by']).toBeUndefined()
  })
})
