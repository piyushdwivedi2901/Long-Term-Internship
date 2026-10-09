/**
 * Fixture generation.
 *
 * League: the circle method. Everyone plays everyone once per leg, nobody
 * sits out more than once per leg (with an odd count, one player rests each
 * round), and home/away alternates so no one is "home" every week. The second
 * leg mirrors the first with home and away swapped.
 *
 * Knockout: a standard seeded bracket (1 v 8, 4 v 5, 2 v 7, 3 v 6 …) so the
 * top two seeds can only meet in the final. With a count that isn't a power
 * of two, the top seeds get byes.
 */
export interface Pairing {
  round: number
  homeId: number
  awayId: number
}

export function roundRobin(ids: number[], legs: 1 | 2 = 1): Pairing[] {
  if (new Set(ids).size !== ids.length) throw new Error('Players must be different')
  if (ids.length < 2) return []
  const BYE = -1
  const list = ids.length % 2 ? [...ids, BYE] : [...ids]
  const n = list.length
  const rounds = n - 1
  const pairs: { round: number; a: number; b: number }[] = []
  // Fix list[0]; rotate the rest one place each round.
  let rot = list.slice(1)
  for (let r = 0; r < rounds; r++) {
    const order = [list[0], ...rot]
    for (let i = 0; i < n / 2; i++) {
      const a = order[i]
      const b = order[n - 1 - i]
      if (a !== BYE && b !== BYE) pairs.push({ round: r + 1, a, b })
    }
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)]
  }
  // Home/away: with an odd number of players, everyone plays an even number
  // of games, so "home if the other is 1…(m−1)/2 places ahead of you (mod m)"
  // gives everyone exactly half at home. With an even number, the last player
  // is home against half the others, so nobody is more than one game off.
  const m = ids.length % 2 ? ids.length : ids.length - 1
  const index = new Map(ids.map((id, i) => [id, i]))
  const aIsHome = (a: number, b: number) => {
    const i = index.get(a)!
    const j = index.get(b)!
    if (i === m) return j >= Math.ceil(m / 2)
    if (j === m) return !(i >= Math.ceil(m / 2))
    return (j - i + m) % m <= (m - 1) / 2
  }
  const firstLeg: Pairing[] = pairs.map(({ round, a, b }) => (aIsHome(a, b) ? { round, homeId: a, awayId: b } : { round, homeId: b, awayId: a }))
  if (legs === 1) return firstLeg
  return [...firstLeg, ...firstLeg.map((p) => ({ round: p.round + rounds, homeId: p.awayId, awayId: p.homeId }))]
}

/** Bracket positions for seeds 1…size: [1, size, …] such that seeds 1 and 2 meet only in the final. */
export function seedOrder(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) throw new Error('Bracket size must be a power of two')
  let order = [1, 2]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    order = order.flatMap((s) => [s, sum - s])
  }
  return order
}

export interface BracketSlot {
  round: number
  /** 0-based position within the round */
  slot: number
  homeId: number | null
  awayId: number | null
  /** true when one side is a bye — the other player goes straight through */
  bye: boolean
}

export const roundCount = (players: number) => Math.max(1, Math.ceil(Math.log2(Math.max(2, players))))

/** First-round pairings for players already sorted by seed (best first). */
export function knockoutFirstRound(seeded: number[]): BracketSlot[] {
  if (new Set(seeded).size !== seeded.length) throw new Error('Players must be different')
  if (seeded.length < 2) throw new Error('A knockout needs at least two players')
  const size = 2 ** roundCount(seeded.length)
  const order = seedOrder(size)
  const slots: BracketSlot[] = []
  for (let i = 0; i < size; i += 2) {
    const home = seeded[order[i] - 1] ?? null
    const away = seeded[order[i + 1] - 1] ?? null
    slots.push({ round: 1, slot: i / 2, homeId: home, awayId: away, bye: home === null || away === null })
  }
  return slots
}

/** Where the winner of (round, slot) plays next. */
export const nextSlot = (round: number, slot: number) => ({ round: round + 1, slot: Math.floor(slot / 2), side: slot % 2 === 0 ? ('home' as const) : ('away' as const) })

/** "Final", "Semi-finals", "Quarter-finals", "Round of 16", "Round 1" */
export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semi-finals'
  if (fromEnd === 2) return 'Quarter-finals'
  return `Round of ${2 ** (fromEnd + 1)}`
}
