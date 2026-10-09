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
  server = createApp(createServices({ repo, passwords: scryptHasher, tokens: jwtSigner('contract') }), {
    sensitiveRateLimit: { max: 1000, windowMs: 60_000 },
  }).listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

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
    const api = make(() => null, storage)
    const e = await api.overview().catch((x) => x)
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(401)
  })

  it('runs the full group lifecycle identically', async () => {
    const piyush = await person('Piyush')
    const aisha = await person('Aisha')
    const g = await piyush.createGroup({ name: 'Goa', currency: 'INR', memberNames: ['Aisha', 'Rohan'] })
    const [p, a, r] = g.members.map((m) => m.id)

    await piyush.createExpense(g.id, { description: 'Villa', amount: 900000, paidBy: p, date: '2026-10-01', category: 'stay', split: { type: 'equal', memberIds: [p, a, r] } })
    await expect(piyush.createExpense(g.id, { description: 'Bad', amount: 1000, paidBy: p, date: '2026-10-01', split: { type: 'exact', amounts: [{ memberId: p, amount: 400 }] } }))
      .rejects.toMatchObject({ status: 400, message: 'The amounts add up to 4.00 — 6.00 still to assign' })

    expect((await aisha.previewInvite(g.inviteCode)).placeholders.map((x) => x.name)).toEqual(['Aisha', 'Rohan'])
    const joined = await aisha.joinGroup({ code: g.inviteCode, claimMemberId: a })
    expect(joined.myBalance).toBe(-300000)

    await aisha.createSettlement(g.id, { fromMember: a, toMember: p, amount: 300000, date: '2026-10-02' })
    const view = await piyush.getGroup(g.id)
    expect(view.plan).toEqual([{ from: r, to: p, amount: 300000 }])
    expect(view.balances.reduce((n, b) => n + b.net, 0)).toBe(0)

    const [expense] = await aisha.listExpenses(g.id)
    expect(expense.canEdit).toBe(false)
    await expect(aisha.deleteExpense(g.id, expense.id)).rejects.toMatchObject({ status: 403 })
    expect((await piyush.activity(g.id))[0].text).toBe('recorded Aisha paying Piyush ₹3,000.00')

    const insights = await piyush.insights(g.id, '2026-10-09')
    expect(insights.byCategory).toEqual([{ category: 'stay', amount: 900000, count: 1 }])
  })

  it('seeds the same sample data and overview', async () => {
    const demo = await person('Demo')
    await demo.seedSample('2026-10-09')
    const o = await demo.overview()
    expect(o.groups.map((g) => g.name).sort()).toEqual(['Berlin conference', 'Flat 4B', 'Goa trip'])
    expect(o.totals.map((t) => t.currency).sort()).toEqual(['EUR', 'INR'])
  })
})
