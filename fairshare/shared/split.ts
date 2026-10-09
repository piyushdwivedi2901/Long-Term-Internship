import { allocate } from './money.ts'

/**
 * How an expense is divided. Stored as entered, so editing an expense shows
 * the same choices the person made; the per-person amounts are derived.
 */
export type Split =
  | { type: 'equal'; memberIds: number[] }
  | { type: 'exact'; amounts: { memberId: number; amount: number }[] }
  /** percent in basis points: 2550 = 25.50% */
  | { type: 'percent'; percents: { memberId: number; basisPoints: number }[] }
  | { type: 'shares'; shares: { memberId: number; shares: number }[] }

export type SplitType = Split['type']

export class SplitError extends Error {
  readonly field: string
  constructor(message: string, field = 'split') {
    super(message)
    this.name = 'SplitError'
    this.field = field
  }
}

/** Returns each member's share in minor units; the shares always sum to `amount`. */
export function computeShares(amount: number, split: Split): Map<number, number> {
  const entries = splitEntries(split)
  const ids = entries.map((e) => e.memberId)
  if (new Set(ids).size !== ids.length) throw new SplitError('Each person can appear only once in a split')

  if (split.type === 'exact') {
    const sum = split.amounts.reduce((n, a) => n + a.amount, 0)
    if (sum !== amount) {
      const diff = amount - sum
      throw new SplitError(
        diff > 0 ? `The amounts add up to ${fmt(sum)} — ${fmt(diff)} still to assign` : `The amounts add up to ${fmt(sum)} — ${fmt(-diff)} too much`,
      )
    }
    return new Map(split.amounts.filter((a) => a.amount > 0).map((a) => [a.memberId, a.amount]))
  }

  if (split.type === 'percent') {
    const total = split.percents.reduce((n, p) => n + p.basisPoints, 0)
    if (total !== 10_000) throw new SplitError(`Percentages add up to ${(total / 100).toFixed(2).replace(/\.00$/, '')}% — they need to total 100%`)
  }

  const weights = entries.map((e) => e.weight)
  if (!weights.some((w) => w > 0)) throw new SplitError('Choose at least one person to split with')
  const parts = allocate(amount, weights)
  const out = new Map<number, number>()
  entries.forEach((e, i) => parts[i] > 0 && out.set(e.memberId, parts[i]))
  return out
}

function splitEntries(split: Split): { memberId: number; weight: number }[] {
  switch (split.type) {
    case 'equal':
      return split.memberIds.map((memberId) => ({ memberId, weight: 1 }))
    case 'exact':
      return split.amounts.map((a) => ({ memberId: a.memberId, weight: a.amount }))
    case 'percent':
      return split.percents.map((p) => ({ memberId: p.memberId, weight: p.basisPoints }))
    case 'shares':
      return split.shares.map((s) => ({ memberId: s.memberId, weight: s.shares }))
  }
}

export const splitMemberIds = (split: Split) => splitEntries(split).map((e) => e.memberId)

const fmt = (minor: number) => (minor / 100).toFixed(2)
