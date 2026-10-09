// @vitest-environment node
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createServices } from '../shared/services.ts'
import { createApp } from './app.ts'
import { jwtSigner, scryptHasher } from './security.ts'
import { createSqliteRepository } from './sqliteRepository.ts'

const SECRET = 'test-secret'
function makeApp(opts: Parameters<typeof createApp>[1] = {}) {
  const services = createServices({ repo: createSqliteRepository(), passwords: scryptHasher, tokens: jwtSigner(SECRET) })
  return createApp(services, opts)
}
async function signup(app: ReturnType<typeof makeApp>, name = 'Piyush') {
  const res = await request(app).post('/api/auth/signup').send({ name, email: `${name.toLowerCase()}@example.com`, password: 'password123' }).expect(201)
  return `Bearer ${res.body.token as string}`
}
const result = (homeGoals: number, awayGoals: number, extra = {}) => ({ homeGoals, awayGoals, homeClub: 'Real Madrid', awayClub: 'Manchester City', ...extra })

describe('Couch Cup API (Express + SQLite)', () => {
  it('runs a crew, a knockout and its results end to end', async () => {
    const app = makeApp()
    const piyush = await signup(app)
    const rohan = await signup(app, 'Rohan')
    const { body: crew } = await request(app).post('/api/crews').set('Authorization', piyush).send({ name: 'Room 12', playerNames: ['Rohan', 'Aisha'] }).expect(201)
    const [p, r, a] = crew.players.map((x: { id: number }) => x.id)

    const { body: preview } = await request(app).post('/api/invites/preview').set('Authorization', rohan).send({ code: crew.inviteCode }).expect(200)
    expect(preview.placeholders.map((x: { name: string }) => x.name)).toEqual(['Rohan', 'Aisha'])
    await request(app).post('/api/invites/join').set('Authorization', rohan).send({ code: crew.inviteCode, claimPlayerId: r }).expect(200)

    const { body: cup } = await request(app).post(`/api/crews/${crew.id}/competitions`).set('Authorization', rohan).send({ name: 'Cup', format: 'knockout', playerIds: [p, r, a], seeding: 'manual' }).expect(201)
    expect(cup.rounds.map((x: { name: string }) => x.name)).toEqual(['Semi-finals', 'Final'])
    const semi = cup.rounds[0].matches.find((m: { status: string }) => m.status === 'scheduled')
    const draw = await request(app).put(`/api/matches/${semi.id}/result`).set('Authorization', rohan).send(result(2, 2)).expect(400)
    expect(draw.body.error.fields.decidedBy).toContain('penalty shoot-out')
    await request(app).put(`/api/matches/${semi.id}/result`).set('Authorization', rohan).send(result(2, 2, { decidedBy: 'penalties', homePens: 5, awayPens: 4 })).expect(200)

    const { body: mid } = await request(app).get(`/api/competitions/${cup.id}`).set('Authorization', piyush).expect(200)
    const final = mid.rounds[1].matches[0]
    expect([final.homeId, final.awayId]).toEqual([p, r])
    await request(app).put(`/api/matches/${final.id}/result`).set('Authorization', piyush).send(result(1, 0)).expect(200)
    const { body: done } = await request(app).get(`/api/competitions/${cup.id}`).set('Authorization', rohan).expect(200)
    expect(done).toMatchObject({ status: 'finished', championId: p })

    const { body: prof } = await request(app).get(`/api/crews/${crew.id}/players/${p}`).set('Authorization', rohan).expect(200)
    expect(prof).toMatchObject({ played: 1, won: 1, trophies: [{ name: 'Cup' }] })
    const { body: feed } = await request(app).get(`/api/crews/${crew.id}/activity`).set('Authorization', rohan).expect(200)
    expect(feed[0].text).toBe('🏆 Piyush won “Cup”')
  })

  it('keeps crews private', async () => {
    const app = makeApp()
    const a = await signup(app)
    const b = await signup(app, 'Stranger')
    const { body: crew } = await request(app).post('/api/crews').set('Authorization', a).send({ name: 'Mine', playerNames: ['X'] }).expect(201)
    const { body: f } = await request(app).post(`/api/crews/${crew.id}/friendlies`).set('Authorization', a).send({ homeId: crew.players[0].id, awayId: crew.players[1].id, ...result(1, 0) }).expect(201)
    await request(app).get(`/api/crews/${crew.id}`).set('Authorization', b).expect(404)
    await request(app).put(`/api/matches/${f.id}/result`).set('Authorization', b).send(result(0, 5)).expect(404)
    await request(app).delete(`/api/matches/${f.id}/result`).set('Authorization', b).expect(404)
    await request(app).post(`/api/crews/${crew.id}/competitions`).set('Authorization', b).send({ name: 'X', format: 'league', playerIds: crew.players.map((x: { id: number }) => x.id) }).expect(404)
  })

  it('only the owner manages the crew; only creator or owner deletes competitions', async () => {
    const app = makeApp()
    const owner = await signup(app)
    const friend = await signup(app, 'Friend')
    const { body: crew } = await request(app).post('/api/crews').set('Authorization', owner).send({ name: 'Room', playerNames: ['Friend'] }).expect(201)
    await request(app).post('/api/invites/join').set('Authorization', friend).send({ code: crew.inviteCode, claimPlayerId: crew.players[1].id }).expect(200)
    await request(app).patch(`/api/crews/${crew.id}`).set('Authorization', friend).send({ name: 'Mine now' }).expect(403)
    await request(app).delete(`/api/crews/${crew.id}`).set('Authorization', friend).expect(403)
    const { body: league } = await request(app).post(`/api/crews/${crew.id}/competitions`).set('Authorization', owner).send({ name: 'L', format: 'league', playerIds: crew.players.map((x: { id: number }) => x.id) }).expect(201)
    await request(app).delete(`/api/competitions/${league.id}`).set('Authorization', friend).expect(403)
    await request(app).delete(`/api/competitions/${league.id}`).set('Authorization', owner).expect(204)
    await request(app).post(`/api/crews/${crew.id}/leave`).set('Authorization', owner).expect(409)
    await request(app).post(`/api/crews/${crew.id}/leave`).set('Authorization', friend).expect(204)
  })

  it('rejects missing, forged, expired and alg:none tokens', async () => {
    const app = makeApp()
    await signup(app)
    await request(app).get('/api/crews').expect(401)
    await request(app).get('/api/crews').set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, 'wrong')}`).expect(401)
    await request(app).get('/api/crews').set('Authorization', `Bearer ${jwt.sign({ sub: '1' }, SECRET, { expiresIn: -10 })}`).expect(401)
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`
    await request(app).get('/api/crews').set('Authorization', `Bearer ${none}`).expect(401)
  })

  it('validates input with field-level messages and rate-limits invite guessing', async () => {
    const app = makeApp({ sensitiveRateLimit: { max: 4, windowMs: 60_000 } })
    const a = await signup(app)
    const { body: crew } = await request(app).post('/api/crews').set('Authorization', a).send({ name: 'R', playerNames: ['B'] }).expect(201)
    const bad = await request(app).post(`/api/crews/${crew.id}/friendlies`).set('Authorization', a).send({ homeId: crew.players[0].id, awayId: crew.players[1].id, homeGoals: -1, awayGoals: 2 }).expect(400)
    expect(bad.body.error.fields.homeGoals).toBe("Goals can't be negative")
    await request(app).post('/api/crews').set('Authorization', a).set('Content-Type', 'application/json').send('{nope').expect(400)
    for (let i = 0; i < 3; i++) await request(app).post('/api/invites/preview').set('Authorization', a).send({ code: 'ZZZZZZZZ' }).expect(404)
    await request(app).post('/api/invites/preview').set('Authorization', a).send({ code: 'ZZZZZZZZ' }).expect(429)
  })

  it('seeds the sample crew and sends security headers', async () => {
    const app = makeApp()
    const a = await signup(app)
    const { body } = await request(app).post('/api/sample').set('Authorization', a).send({}).expect(201)
    expect(body[0].name).toBe('Hostel Room 12')
    const res = await request(app).get('/api/overview').set('Authorization', a).expect(200)
    expect(res.body.crews).toHaveLength(1)
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})
