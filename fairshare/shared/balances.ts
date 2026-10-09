/**
 * Balances and the settle-up plan.
 *
 * A member's net balance = what they paid for the group − their share of it
 * + settlements they received − settlements they paid... with signs chosen so
 * positive means "is owed money" and negative means "owes money". Across a
 * group the nets always sum to zero.
 */
export interface Ledger {
  expenses: { paidBy: number; amount: number; shares: Record<number, number> | Map<number, number> }[]
  settlements: { fromMember: number; toMember: number; amount: number }[]
}

export interface MemberBalance {
  memberId: number
  paid: number
  share: number
  /** settlements paid out minus settlements received */
  settled: number
  net: number
}

export interface Transfer {
  from: number
  to: number
  amount: number
}

const entries = (s: Record<number, number> | Map<number, number>) =>
  s instanceof Map ? [...s.entries()] : Object.entries(s).map(([k, v]) => [Number(k), v] as [number, number])

export function computeBalances(memberIds: number[], ledger: Ledger): MemberBalance[] {
  const rows = new Map(memberIds.map((id) => [id, { memberId: id, paid: 0, share: 0, settled: 0, net: 0 }]))
  const row = (id: number) => {
    let r = rows.get(id)
    if (!r) rows.set(id, (r = { memberId: id, paid: 0, share: 0, settled: 0, net: 0 }))
    return r
  }
  for (const e of ledger.expenses) {
    row(e.paidBy).paid += e.amount
    for (const [id, share] of entries(e.shares)) row(id).share += share
  }
  for (const s of ledger.settlements) {
    row(s.fromMember).settled += s.amount
    row(s.toMember).settled -= s.amount
  }
  for (const r of rows.values()) r.net = r.paid - r.share + r.settled
  return [...rows.values()]
}

/**
 * Turns net balances into a short list of payments that settles everyone.
 * Greedy: the biggest debtor pays the biggest creditor, repeat. Each step
 * zeroes at least one person, so a group of n people needs at most n − 1
 * payments. Ties break on member id, so the plan is stable between renders.
 */
export function simplifyDebts(balances: { memberId: number; net: number }[]): Transfer[] {
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ id: b.memberId, amt: -b.net }))
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ id: b.memberId, amt: b.net }))
  const byAmount = (a: { id: number; amt: number }, b: { id: number; amt: number }) => b.amt - a.amt || a.id - b.id
  const transfers: Transfer[] = []
  while (debtors.length && creditors.length) {
    debtors.sort(byAmount)
    creditors.sort(byAmount)
    const d = debtors[0]
    const c = creditors[0]
    const amount = Math.min(d.amt, c.amt)
    transfers.push({ from: d.id, to: c.id, amount })
    d.amt -= amount
    c.amt -= amount
    if (d.amt === 0) debtors.shift()
    if (c.amt === 0) creditors.shift()
  }
  return transfers
}
