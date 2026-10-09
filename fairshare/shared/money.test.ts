// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { allocate, formatMoney, parseMoney, toInputValue } from './money.ts'
import { SplitError, computeShares, type Split } from './split.ts'
import { computeBalances, simplifyDebts } from './balances.ts'

/** Small deterministic PRNG so "random" tests are reproducible. */
function rng(seed: number) {
  return (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n)
}

describe('money', () => {
  it('formats INR with Indian digit grouping and other currencies normally', () => {
    expect(formatMoney(12345670, 'INR')).toBe('₹1,23,456.70')
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
    expect(formatMoney(-5000, 'INR', { signed: true })).toBe('-₹50.00')
    expect(formatMoney(5000, 'INR', { signed: true })).toBe('+₹50.00')
  })

  it('parses typed amounts into exact minor units', () => {
    expect(parseMoney('1,200')).toBe(120000)
    expect(parseMoney('₹ 99.5')).toBe(9950)
    expect(parseMoney('0.10')).toBe(10)
    expect(parseMoney('12.345')).toBeNull()
    expect(parseMoney('-5')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('')).toBeNull()
    expect(toInputValue(120050)).toBe('1200.50')
    expect(toInputValue(120000)).toBe('1200')
  })

  it('allocates without losing or inventing a single paisa', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(1000, [1, 2])).toEqual([333, 667])
    const r = rng(7)
    for (let i = 0; i < 2000; i++) {
      const total = r(10_000_000)
      const weights = Array.from({ length: 1 + r(12) }, () => r(500))
      if (!weights.some((w) => w > 0)) continue
      const parts = allocate(total, weights)
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      parts.forEach((p, k) => {
        const exact = (total * weights[k]) / weights.reduce((a, b) => a + b, 0)
        expect(Math.abs(p - exact)).toBeLessThan(1) // never more than one paisa off the fair amount
      })
    }
  })
})

describe('splits', () => {
  it('equal: ₹100 three ways', () => {
    expect([...computeShares(10000, { type: 'equal', memberIds: [1, 2, 3] })]).toEqual([[1, 3334], [2, 3333], [3, 3333]])
  })

  it('exact: must add up to the total, with a helpful message', () => {
    expect(computeShares(5000, { type: 'exact', amounts: [{ memberId: 1, amount: 2000 }, { memberId: 2, amount: 3000 }] }).get(2)).toBe(3000)
    expect(() => computeShares(5000, { type: 'exact', amounts: [{ memberId: 1, amount: 2000 }] })).toThrow('30.00 still to assign')
    expect(() => computeShares(5000, { type: 'exact', amounts: [{ memberId: 1, amount: 6000 }] })).toThrow('10.00 too much')
  })

  it('percent: must total 100%', () => {
    const s = computeShares(10000, { type: 'percent', percents: [{ memberId: 1, basisPoints: 2550 }, { memberId: 2, basisPoints: 7450 }] })
    expect([...s]).toEqual([[1, 2550], [2, 7450]])
    expect(() => computeShares(10000, { type: 'percent', percents: [{ memberId: 1, basisPoints: 5000 }] })).toThrow('add up to 50%')
  })

  it('shares: 2 : 1 : 1 for a family vs two singles', () => {
    expect([...computeShares(4000, { type: 'shares', shares: [{ memberId: 1, shares: 2 }, { memberId: 2, shares: 1 }, { memberId: 3, shares: 1 }] })]).toEqual([
      [1, 2000],
      [2, 1000],
      [3, 1000],
    ])
  })

  it('rejects empty splits and duplicate people', () => {
    expect(() => computeShares(100, { type: 'equal', memberIds: [] })).toThrow(SplitError)
    expect(() => computeShares(100, { type: 'equal', memberIds: [1, 1] })).toThrow('only once')
    expect(() => computeShares(100, { type: 'shares', shares: [{ memberId: 1, shares: 0 }] })).toThrow('at least one')
  })

  it('every split type always sums to the expense amount (fuzzed)', () => {
    const r = rng(42)
    for (let i = 0; i < 1500; i++) {
      const amount = 1 + r(5_000_000)
      const ids = [...new Set(Array.from({ length: 1 + r(8) }, () => 1 + r(20)))]
      const kind = r(3)
      const split: Split =
        kind === 0
          ? { type: 'equal', memberIds: ids }
          : kind === 1
            ? { type: 'shares', shares: ids.map((memberId) => ({ memberId, shares: 1 + r(5) })) }
            : (() => {
                const bp = allocate(10_000, ids.map(() => 1 + r(9)))
                return { type: 'percent', percents: ids.map((memberId, k) => ({ memberId, basisPoints: bp[k] })) } as Split
              })()
      const total = [...computeShares(amount, split).values()].reduce((a, b) => a + b, 0)
      expect(total).toBe(amount)
    }
  })
})

describe('balances and settle-up', () => {
  it('works through a weekend trip', () => {
    // 1 = Aisha, 2 = Rohan, 3 = Meera
    const ledger = {
      expenses: [
        { paidBy: 1, amount: 900000, shares: computeShares(900000, { type: 'equal', memberIds: [1, 2, 3] }) }, // villa ₹9,000
        { paidBy: 2, amount: 150000, shares: computeShares(150000, { type: 'equal', memberIds: [1, 2, 3] }) }, // dinner ₹1,500
      ],
      settlements: [{ fromMember: 3, toMember: 1, amount: 100000 }], // Meera paid Aisha back ₹1,000
    }
    const b = computeBalances([1, 2, 3], ledger)
    expect(b.map((x) => [x.memberId, x.net])).toEqual([
      [1, 900000 - 350000 - 100000],
      [2, 150000 - 350000],
      [3, -350000 + 100000],
    ])
    expect(b.reduce((n, x) => n + x.net, 0)).toBe(0)
    expect(simplifyDebts(b)).toEqual([
      { from: 3, to: 1, amount: 250000 },
      { from: 2, to: 1, amount: 200000 },
    ])
  })

  it('settle-up plans always clear every balance in at most n − 1 payments (fuzzed)', () => {
    const r = rng(99)
    for (let i = 0; i < 500; i++) {
      const n = 2 + r(9)
      const ids = Array.from({ length: n }, (_, k) => k + 1)
      const expenses = Array.from({ length: 1 + r(15) }, () => {
        const amount = 1 + r(1_000_000)
        const who = ids.filter(() => r(2) === 0)
        const memberIds = who.length ? who : [ids[0]]
        return { paidBy: ids[r(n)], amount, shares: computeShares(amount, { type: 'equal', memberIds }) }
      })
      const balances = computeBalances(ids, { expenses, settlements: [] })
      expect(balances.reduce((s, b) => s + b.net, 0)).toBe(0)
      const plan = simplifyDebts(balances)
      expect(plan.length).toBeLessThanOrEqual(n - 1)
      const after = computeBalances(ids, { expenses, settlements: plan.map((t) => ({ fromMember: t.from, toMember: t.to, amount: t.amount })) })
      expect(after.every((b) => b.net === 0)).toBe(true)
      expect(plan.every((t) => t.amount > 0)).toBe(true)
    }
  })

  it('needs no payments when everyone is even', () => {
    expect(simplifyDebts([{ memberId: 1, net: 0 }, { memberId: 2, net: 0 }])).toEqual([])
  })
})
