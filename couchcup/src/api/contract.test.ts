// @vitest-environment node
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../server/app.ts'
import { createSqliteRepository } from '../../server/sqliteRepository.ts'
import { jwtSigner, scryptHasher } from '../../server/security.ts'
import { createServices } from '../../shared/services.ts'
import { createDemoClient } from './demo.ts'
import { createHttpClient } from './http.ts'
import { ApiError, type ApiClient } from './types.ts'
import { memoryStorage } from '../test/memoryStorage.ts'

/** One contract, two implementations: the browser demo must behave exactly like the real API. */
let server: Server
let base = ''
beforeAll(async () => {
  const repo = createSqliteRepository(':memory:')
  server = createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner('contract') }), { sensitiveRateLimit: { max: 1000, windowMs: 60_000 } }).listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

const result = (homeGoals: number, awayGoals: number, extra = {}) => ({ homeGoals, awayGoals, homeClub: 'Real Madrid', awayClub: 'Arsenal', ...extra })

describe.each<[string, (t: () => string | null, storage: Storage) => ApiClient]>([
  ['http (Express + SQLite)', (t) => createHttpClient(base, t)],
  ['demo (in-browser)', (t, storage) => createDemoClient(t, { storage, latencyMs: 0 })],
])('%s', (_name, make) => {
  const storage = memoryStorage() // shared per implementation, like one server / one browser
  const person = async (name: string) => {
    let token: string | null = null
    const api = make(() => token, storage)
    token = (await api.signup({ name, email: `${name}-${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'password123' })).token
    return api
  }

  it('rejects calls without a session', async () => {
    const e = await make(() => null, storage).overview().catch((x) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(401)
  })

  it('runs a crew, a cup and a friendly identically', async () => {
    const piyush = await person('Piyush')
    const rohan = await person('Rohan')
    const crew = await piyush.createCrew({ name: 'Room 12', playerNames: ['Rohan', 'Aisha', 'Kabir'] })
    const [p, r, a, k] = crew.players.map((x) => x.id)
    expect((await rohan.previewInvite(crew.inviteCode)).placeholders.map((x) => x.name)).toEqual(['Rohan', 'Aisha', 'Kabir'])
    await rohan.joinCrew({ code: crew.inviteCode, claimPlayerId: r })

    const cup = await rohan.createCompetition(crew.id, { name: 'Cup', format: 'knockout', playerIds: [p, r, a, k], seeding: 'manual' })
    const [sf1, sf2] = cup.rounds[0].matches
    await expect(rohan.recordResult(sf1.id, result(1, 1))).rejects.toMatchObject({ status: 400, fields: { decidedBy: expect.stringContaining('penalty') } })
    await rohan.recordResult(sf1.id, result(1, 1, { decidedBy: 'penalties', homePens: 4, awayPens: 2 }))
    await piyush.recordResult(sf2.id, result(3, 0)) // Rohan (2nd seed) beats Aisha
    const final = (await piyush.getCompetition(cup.id)).rounds[1].matches[0]
    expect([final.homeId, final.awayId]).toEqual([p, r])
    await piyush.recordResult(final.id, result(2, 1))
    expect(await rohan.getCompetition(cup.id)).toMatchObject({ status: 'finished', championId: p })

    const f = await rohan.addFriendly(crew.id, { homeId: r, awayId: p, ...result(4, 0) })
    expect(f).toMatchObject({ roundLabel: 'Friendly', ratingDelta: expect.any(Number) })
    const prof = await piyush.playerProfile(crew.id, p)
    expect(prof).toMatchObject({ played: 3, trophies: [{ name: 'Cup' }] })
    const detail = await piyush.getCrew(crew.id)
    expect(detail.leaderboard.reduce((n, x) => n + x.rating, 0)).toBe(4000)
    expect((await rohan.crewActivity(crew.id))[0].text).toContain('friendly')
  })

  it('seeds the same sample crew', async () => {
    const demo = await person('Demo')
    const [crew] = await demo.seedSample()
    const d = await demo.getCrew(crew.id)
    expect(d.competitions.map((c) => [c.name, c.status, c.total])).toEqual([
      ['Season 2', 'active', 30],
      ['Diwali Cup', 'active', 5],
      ['Season 1', 'finished', 15],
    ])
  })
})
