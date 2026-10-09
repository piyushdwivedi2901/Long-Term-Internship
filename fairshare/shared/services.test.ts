// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { AppError } from './errors.ts'
import { testServices } from './testing.ts'

async function world() {
  const { services, repo } = testServices()
  const signup = async (name: string) => (await services.auth.signup({ name, email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`, password: 'password123' })).user.id
  const piyush = await signup('Piyush')
  const group = services.groups.create(piyush, { name: 'Goa', currency: 'INR', memberNames: ['Aisha', 'Rohan'] })
  const [me, aisha, rohan] = group.members.map((m) => m.id)
  return { services, repo, signup, piyush, group, me, aisha, rohan }
}

const err = (fn: () => unknown): AppError => {
  try {
    fn()
  } catch (e) {
    return e as AppError
  }
  throw new Error('expected an error')
}

describe('groups', () => {
  it('creates a group with you plus named people and an 8-character invite code', async () => {
    const { group } = await world()
    expect(group.members.map((m) => [m.name, m.isYou, m.claimed])).toEqual([
      ['Piyush', true, true],
      ['Aisha', false, false],
      ['Rohan', false, false],
    ])
    expect(group.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    expect(group.isOwner).toBe(true)
  })

  it('rejects duplicate names', async () => {
    const { services, piyush } = await world()
    expect(err(() => services.groups.create(piyush, { name: 'X', memberNames: ['Sam', 'sam'] })).status).toBe(400)
  })

  it('hides groups from people who are not members', async () => {
    const { services, signup, group } = await world()
    const stranger = await signup('Stranger')
    expect(services.groups.list(stranger)).toEqual([])
    expect(err(() => services.groups.get(stranger, group.id)).status).toBe(404)
    expect(err(() => services.expenses.list(stranger, group.id)).status).toBe(404)
  })

  it('locks the currency once there are expenses', async () => {
    const { services, piyush, group, me } = await world()
    services.groups.update(piyush, group.id, { currency: 'USD' })
    services.expenses.create(piyush, group.id, { description: 'x', amount: 100, paidBy: me, date: '2026-10-01', split: { type: 'equal', memberIds: [me] } })
    expect(err(() => services.groups.update(piyush, group.id, { currency: 'EUR' })).status).toBe(409)
  })
})

describe('invites', () => {
  it('lets a friend join as an existing person, keeping their history and balance', async () => {
    const { services, signup, piyush, group, me, aisha } = await world()
    services.expenses.create(piyush, group.id, { description: 'Taxi', amount: 60000, paidBy: me, date: '2026-10-01', category: 'travel', split: { type: 'equal', memberIds: [me, aisha] } })
    const friend = await signup('Aisha K')
    const preview = services.groups.previewInvite(friend, { code: group.inviteCode.toLowerCase() })
    expect(preview.placeholders.map((p) => p.name)).toEqual(['Aisha', 'Rohan'])
    const joined = services.groups.join(friend, { code: group.inviteCode, claimMemberId: aisha })
    expect(joined.myMemberId).toBe(aisha)
    expect(joined.myBalance).toBe(-30000) // owes half the taxi
    expect(joined.members.find((m) => m.id === aisha)).toMatchObject({ name: 'Aisha K', claimed: true, isYou: true })
    // A second person can't claim the same spot
    const imposter = await signup('Imposter')
    expect(err(() => services.groups.join(imposter, { code: group.inviteCode, claimMemberId: aisha })).status).toBe(409)
  })

  it('joins as a new person, and rejects unknown codes', async () => {
    const { services, signup, group } = await world()
    const sam = await signup('Sam')
    expect(services.groups.join(sam, { code: group.inviteCode }).members).toHaveLength(4)
    expect(err(() => services.groups.previewInvite(sam, { code: 'ZZZZZZZZ' })).status).toBe(404)
    expect(err(() => services.groups.previewInvite(sam, { code: 'bad' })).status).toBe(400)
  })

  it('a new invite code stops the old one working (owner only)', async () => {
    const { services, signup, piyush, group } = await world()
    const sam = await signup('Sam')
    services.groups.join(sam, { code: group.inviteCode })
    expect(err(() => services.groups.regenerateInvite(sam, group.id)).status).toBe(403)
    const fresh = services.groups.regenerateInvite(piyush, group.id)
    expect(fresh.inviteCode).not.toBe(group.inviteCode)
    expect(err(() => services.groups.previewInvite(sam, { code: group.inviteCode })).status).toBe(404)
  })
})

describe('expenses, balances and payments', () => {
  it('keeps balances and the settle-up plan in sync with every change', async () => {
    const { services, piyush, group, me, aisha, rohan } = await world()
    services.expenses.create(piyush, group.id, { description: 'Villa', amount: 900000, paidBy: aisha, date: '2026-10-01', category: 'stay', split: { type: 'equal', memberIds: [me, aisha, rohan] } })
    services.expenses.create(piyush, group.id, { description: 'Dinner', amount: 150000, paidBy: rohan, date: '2026-10-02', category: 'food', split: { type: 'equal', memberIds: [me, aisha, rohan] } })
    let g = services.groups.get(piyush, group.id)
    expect(g.balances.map((b) => [b.memberId, b.net])).toEqual([[me, -350000], [aisha, 550000], [rohan, -200000]])
    expect(g.plan).toEqual([
      { from: me, to: aisha, amount: 350000 },
      { from: rohan, to: aisha, amount: 200000 },
    ])
    services.settlements.create(piyush, group.id, { fromMember: me, toMember: aisha, amount: 350000, date: '2026-10-05', note: 'UPI' })
    g = services.groups.get(piyush, group.id)
    expect(g.myBalance).toBe(0)
    expect(g.plan).toEqual([{ from: rohan, to: aisha, amount: 200000 }])
  })

  it('validates splits against the amount and the group', async () => {
    const { services, piyush, group, me, aisha } = await world()
    const base = { description: 'x', amount: 10000, paidBy: me, date: '2026-10-01' }
    expect(err(() => services.expenses.create(piyush, group.id, { ...base, split: { type: 'exact', amounts: [{ memberId: me, amount: 4000 }, { memberId: aisha, amount: 5000 }] } })).message).toContain('10.00 still to assign')
    expect(err(() => services.expenses.create(piyush, group.id, { ...base, split: { type: 'percent', percents: [{ memberId: me, basisPoints: 9000 }] } })).message).toContain('need to total 100%')
    expect(err(() => services.expenses.create(piyush, group.id, { ...base, split: { type: 'equal', memberIds: [999] } })).fields).toEqual({ split: 'Choose people from this group' })
    expect(err(() => services.expenses.create(piyush, group.id, { ...base, amount: 0, split: { type: 'equal', memberIds: [me] } })).fields).toMatchObject({ amount: 'Enter an amount above zero' })
    expect(err(() => services.expenses.create(piyush, group.id, { ...base, date: '2026-02-30', split: { type: 'equal', memberIds: [me] } })).fields).toMatchObject({ date: 'Enter a real date' })
  })

  it('only the creator or the group owner can edit or delete an expense', async () => {
    const { services, signup, piyush, group, me } = await world()
    const sam = await signup('Sam')
    services.groups.join(sam, { code: group.inviteCode })
    const e = services.expenses.create(piyush, group.id, { description: 'Mine', amount: 1000, paidBy: me, date: '2026-10-01', split: { type: 'equal', memberIds: [me] } })
    expect(services.expenses.list(sam, group.id)[0].canEdit).toBe(false)
    expect(err(() => services.expenses.remove(sam, group.id, e.id)).status).toBe(403)
    services.expenses.update(piyush, group.id, e.id, { description: 'Renamed', amount: 2000, paidBy: me, date: '2026-10-01', split: { type: 'equal', memberIds: [me] } })
    expect(services.expenses.list(piyush, group.id)[0]).toMatchObject({ description: 'Renamed', amount: 2000 })
  })

  it("won't remove people who are part of the history, or let you leave owing money", async () => {
    const { services, signup, piyush, group, me, rohan } = await world()
    services.expenses.create(piyush, group.id, { description: 'Snacks', amount: 2000, paidBy: rohan, date: '2026-10-01', split: { type: 'equal', memberIds: [me, rohan] } })
    expect(err(() => services.members.remove(piyush, group.id, rohan)).status).toBe(409)
    const extra = services.members.add(piyush, group.id, { name: 'Temp' })
    services.members.remove(piyush, group.id, extra.id)
    expect(err(() => services.groups.leave(piyush, group.id)).status).toBe(409) // owner
    const sam = await signup('Sam')
    const joined = services.groups.join(sam, { code: group.inviteCode })
    services.expenses.create(sam, group.id, { description: 'Owed', amount: 1000, paidBy: me, date: '2026-10-01', split: { type: 'equal', memberIds: [joined.myMemberId] } })
    expect(err(() => services.groups.leave(sam, group.id)).message).toContain('Settle your balance of ₹10.00')
  })
})

describe('overview, insights, activity, accounts', () => {
  it('summarises everything across groups per currency', async () => {
    const { services, signup } = await world()
    const u = await signup('Demo')
    services.seedSample(u, '2026-10-09')
    const o = services.overview(u)
    expect(o.groups.map((g) => g.name).sort()).toEqual(['Berlin conference', 'Flat 4B', 'Goa trip'])
    expect(o.totals.map((t) => t.currency).sort()).toEqual(['EUR', 'INR'])
    const inr = o.totals.find((t) => t.currency === 'INR')!
    const byName = Object.fromEntries(o.groups.map((g) => [g.name, g.myBalance]))
    expect(inr.owed - inr.owe).toBe(byName['Goa trip'] + byName['Flat 4B'])
    expect(o.activity.length).toBeGreaterThan(0)
    for (const g of o.groups) {
      const detail = services.groups.get(u, g.id)
      expect(detail.balances.reduce((n, b) => n + b.net, 0)).toBe(0)
    }
  })

  it('reports spending by category and month', async () => {
    const { services, piyush, group, me } = await world()
    const add = (amount: number, category: 'food' | 'travel', date: string) =>
      services.expenses.create(piyush, group.id, { description: 'x', amount, paidBy: me, date, category, split: { type: 'equal', memberIds: [me] } })
    add(1000, 'food', '2026-10-01')
    add(3000, 'travel', '2026-09-15')
    add(500, 'food', '2026-05-01')
    const i = services.insights(piyush, group.id, '2026-10-09')
    expect(i.total).toBe(4500)
    expect(i.byCategory).toEqual([
      { category: 'travel', amount: 3000, count: 1 },
      { category: 'food', amount: 1500, count: 2 },
    ])
    expect(i.byMonth.map((m) => m.month)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(i.byMonth.map((m) => m.amount)).toEqual([500, 0, 0, 0, 3000, 1000])
  })

  it('renaming your profile renames you in every group', async () => {
    const { services, piyush, group } = await world()
    services.auth.updateProfile(piyush, { name: 'Piyush D' })
    expect(services.groups.get(piyush, group.id).members[0].name).toBe('Piyush D')
  })

  it('deleting an account keeps shared history intact for everyone else', async () => {
    const { services, signup, piyush, group, me, aisha } = await world()
    const sam = await signup('Sam')
    const joined = services.groups.join(sam, { code: group.inviteCode })
    services.expenses.create(piyush, group.id, { description: 'Cab', amount: 3000, paidBy: me, date: '2026-10-01', split: { type: 'equal', memberIds: [me, aisha, joined.myMemberId] } })
    await services.auth.deleteAccount(piyush, { password: 'password123' })
    const seenBySam = services.groups.get(sam, group.id)
    expect(seenBySam.isOwner).toBe(true) // ownership passed on
    expect(seenBySam.members.find((m) => m.id === me)).toMatchObject({ name: 'Piyush', claimed: false })
    expect(seenBySam.myBalance).toBe(-1000)
  })
})
