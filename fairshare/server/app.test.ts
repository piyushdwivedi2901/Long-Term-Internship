// @vitest-environment node
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createServices } from '../shared/services.ts'
import { createApp, type AppOptions } from './app.ts'
import { createSqliteRepository } from './sqliteRepository.ts'
import { jwtSigner, scryptHasher } from './security.ts'

const SECRET = 'test-secret'
function makeApp(opts: AppOptions = {}, file = ':memory:') {
  const repo = createSqliteRepository(file)
  return { repo, app: createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner(SECRET) }), opts) }
}
type App = ReturnType<typeof makeApp>['app']
async function user(app: App, name: string) {
  const res = await request(app).post('/api/auth/signup').send({ name, email: `${name.toLowerCase()}@example.com`, password: 'password123' })
  return { Authorization: `Bearer ${res.body.token}` }
}

describe('security', () => {
  it('rejects missing, forged and expired tokens', async () => {
    const { app } = makeApp()
    await user(app, 'Piyush')
    const forged = jwt.sign({ sub: '1' }, 'nope')
    const expired = jwt.sign({ sub: '1' }, SECRET, { expiresIn: -1 })
    for (const h of [undefined, `Bearer ${forged}`, `Bearer ${expired}`, 'Bearer junk']) {
      expect((await request(app).get('/api/overview').set(h ? { Authorization: h } : {})).status).toBe(401)
    }
  })

  it('stores scrypt hashes and never returns them', async () => {
    const { app, repo } = makeApp()
    const res = await request(app).post('/api/auth/signup').send({ name: 'P', email: 'p@example.com', password: 'password123' })
    expect(JSON.stringify(res.body)).not.toMatch(/password123|scrypt/)
    expect(repo.users.byEmail('p@example.com')!.passwordHash).toMatch(/^scrypt\$/)
  })

  it('rate-limits invite-code guessing', async () => {
    const { app } = makeApp({ sensitiveRateLimit: { max: 3, windowMs: 60_000 } })
    const auth = await user(app, 'Piyush') // 1 of 3
    expect((await request(app).post('/api/invites/preview').set(auth).send({ code: 'AAAAAAAA' })).status).toBe(404)
    expect((await request(app).post('/api/invites/preview').set(auth).send({ code: 'BBBBBBBB' })).status).toBe(404)
    expect((await request(app).post('/api/invites/preview').set(auth).send({ code: 'CCCCCCCC' })).status).toBe(429)
  })

  it('returns structured validation errors', async () => {
    const { app } = makeApp()
    const auth = await user(app, 'Piyush')
    const g = (await request(app).post('/api/groups').set(auth).send({ name: 'Trip' })).body
    const res = await request(app).post(`/api/groups/${g.id}/expenses`).set(auth).send({ description: '', amount: 10.5, paidBy: g.myMemberId, date: 'soon', split: { type: 'equal', memberIds: [] } })
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toMatchObject({
      description: 'Describe the expense',
      amount: 'Amounts are in whole paise',
      date: 'Use the format YYYY-MM-DD',
      'split.memberIds': 'Choose at least one person to split with',
    })
  })
})

describe('a real group over HTTP', () => {
  it('two accounts share a group via invite code and settle up', async () => {
    const { app } = makeApp()
    const piyush = await user(app, 'Piyush')
    const aisha = await user(app, 'Aisha')

    const g = (await request(app).post('/api/groups').set(piyush).send({ name: 'Goa', currency: 'INR', memberNames: ['Aisha', 'Rohan'] })).body
    const [pid, aid, rid] = g.members.map((m: { id: number }) => m.id)
    await request(app).post(`/api/groups/${g.id}/expenses`).set(piyush).send({ description: 'Villa', amount: 900000, paidBy: pid, date: '2026-10-01', category: 'stay', split: { type: 'equal', memberIds: [pid, aid, rid] } })

    // Aisha can't see it until she joins…
    expect((await request(app).get(`/api/groups/${g.id}`).set(aisha)).status).toBe(404)
    const preview = (await request(app).post('/api/invites/preview').set(aisha).send({ code: g.inviteCode })).body
    expect(preview.placeholders.map((p: { name: string }) => p.name)).toEqual(['Aisha', 'Rohan'])
    const joined = (await request(app).post('/api/invites/join').set(aisha).send({ code: g.inviteCode, claimMemberId: aid })).body
    expect(joined.myBalance).toBe(-300000)

    // …then she records paying Piyush back, and both see the same plan.
    await request(app).post(`/api/groups/${g.id}/settlements`).set(aisha).send({ fromMember: aid, toMember: pid, amount: 300000, date: '2026-10-03', note: 'UPI' })
    const forPiyush = (await request(app).get(`/api/groups/${g.id}`).set(piyush)).body
    expect(forPiyush.myBalance).toBe(300000)
    expect(forPiyush.plan).toEqual([{ from: rid, to: pid, amount: 300000 }])

    const activity = (await request(app).get(`/api/groups/${g.id}/activity`).set(piyush)).body
    expect(activity[0]).toMatchObject({ actorName: 'Aisha', isYou: false, text: 'recorded Aisha paying Piyush ₹3,000.00' })

    // Aisha can't delete Piyush's expense; Piyush (creator + owner) can.
    const [villa] = (await request(app).get(`/api/groups/${g.id}/expenses`).set(aisha)).body
    expect(villa.canEdit).toBe(false)
    expect((await request(app).delete(`/api/groups/${g.id}/expenses/${villa.id}`).set(aisha)).status).toBe(403)
    expect((await request(app).delete(`/api/groups/${g.id}/expenses/${villa.id}`).set(piyush)).status).toBe(204)
  })

  it('serves the sample workspace, insights and overview', async () => {
    const { app } = makeApp()
    const auth = await user(app, 'Demo')
    expect((await request(app).post('/api/sample').set(auth).send({ today: '2026-10-09' })).status).toBe(201)
    const overview = (await request(app).get('/api/overview').set(auth)).body
    expect(overview.groups).toHaveLength(3)
    const goa = overview.groups.find((g: { name: string }) => g.name === 'Goa trip')
    const insights = (await request(app).get(`/api/groups/${goa.id}/insights`).query({ today: '2026-10-09' }).set(auth)).body
    expect(insights.total).toBe(2_400_000 + 3_120_000 + 486_000 + 240_000 + 360_000 + 182_550)
    expect(insights.byCategory[0].category).toBe('travel')
  })

  it('persists across restarts', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const file = `${mkdtempSync(`${tmpdir()}/fairshare-`)}/db.sqlite`
    const a = makeApp({}, file)
    const auth = await user(a.app, 'Piyush')
    await request(a.app).post('/api/groups').set(auth).send({ name: 'Durable' })
    a.repo.close()
    const b = makeApp({}, file)
    expect((await request(b.app).get('/api/groups').set(auth)).body.map((g: { name: string }) => g.name)).toEqual(['Durable'])
    b.repo.close()
  })

  it('serves the built app with correct caching', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const dir = mkdtempSync(`${tmpdir()}/fs-static-`)
    mkdirSync(`${dir}/assets`)
    writeFileSync(`${dir}/index.html`, '<title>Fairshare</title>')
    writeFileSync(`${dir}/assets/a-1.js`, '1')
    const { app } = makeApp({ staticDir: dir })
    const index = await request(app).get('/groups/1')
    expect(index.text).toContain('Fairshare')
    expect(index.headers['cache-control']).toBe('no-cache')
    expect((await request(app).get('/assets/a-1.js')).headers['cache-control']).toContain('immutable')
  })
})
