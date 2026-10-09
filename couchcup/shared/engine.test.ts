import { describe, expect, it } from 'vitest'
import { CLUBS, clubCode, fairSpin } from './clubs.ts'
import { knockoutFirstRound, nextSlot, roundCount, roundName, roundRobin, seedOrder } from './fixtures.ts'
import { expectedScore, marginMultiplier, playerStats, ratings, records, standings, winnerOf, type PlayedMatch } from './engine.ts'

let seq = 0
const m = (homeId: number, awayId: number, homeGoals: number, awayGoals: number, extra: Partial<PlayedMatch> = {}): PlayedMatch => ({
  id: ++seq,
  homeId,
  awayId,
  homeGoals,
  awayGoals,
  decidedBy: 'normal',
  homePens: null,
  awayPens: null,
  homeClub: 'Real Madrid',
  awayClub: 'Arsenal',
  playedAt: `2026-10-01T10:${String(seq % 60).padStart(2, '0')}:00Z`,
  ...extra,
})
const PTS = { win: 3, draw: 1, loss: 0 }

describe('league fixtures (circle method)', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 11, 16]) {
    it(`${n} players: everyone meets everyone exactly once per leg, once per round, balanced home/away`, () => {
      const ids = Array.from({ length: n }, (_, i) => i + 1)
      const one = roundRobin(ids, 1)
      expect(one).toHaveLength((n * (n - 1)) / 2)
      const pairs = new Set(one.map((p) => [Math.min(p.homeId, p.awayId), Math.max(p.homeId, p.awayId)].join('-')))
      expect(pairs.size).toBe(one.length)
      const rounds = Math.max(...one.map((p) => p.round))
      expect(rounds).toBe(n % 2 ? n : n - 1)
      for (let r = 1; r <= rounds; r++) {
        const inRound = one.filter((p) => p.round === r).flatMap((p) => [p.homeId, p.awayId])
        expect(new Set(inRound).size).toBe(inRound.length) // nobody plays twice in a round
      }
      for (const id of ids) {
        const home = one.filter((p) => p.homeId === id).length
        const away = one.filter((p) => p.awayId === id).length
        expect(Math.abs(home - away)).toBeLessThanOrEqual(1)
      }
      const two = roundRobin(ids, 2)
      expect(two).toHaveLength(one.length * 2)
      for (const id of ids) expect(two.filter((p) => p.homeId === id).length).toBe(n - 1) // home and away against everyone
    })
  }
})

describe('knockout bracket', () => {
  it('seeds so the top two can only meet in the final', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
  })

  it('gives the top seeds byes when the count is not a power of two', () => {
    const r1 = knockoutFirstRound([10, 20, 30, 40, 50, 60])
    expect(roundCount(6)).toBe(3)
    expect(r1).toHaveLength(4)
    expect(r1.filter((s) => s.bye).map((s) => s.homeId)).toEqual([10, 20])
    expect(r1.find((s) => s.slot === 1)).toMatchObject({ homeId: 40, awayId: 50, bye: false })
  })

  it('advances winners to the right half of the next round', () => {
    expect(nextSlot(1, 0)).toEqual({ round: 2, slot: 0, side: 'home' })
    expect(nextSlot(1, 3)).toEqual({ round: 2, slot: 1, side: 'away' })
    expect(roundName(3, 3)).toBe('Final')
    expect(roundName(1, 4)).toBe('Round of 16')
  })

  it('decides a level knockout match on penalties', () => {
    expect(winnerOf(m(1, 2, 2, 2, { decidedBy: 'penalties', homePens: 4, awayPens: 5 }))).toBe(2)
    expect(winnerOf(m(1, 2, 2, 2))).toBeNull()
    expect(winnerOf(m(1, 2, 3, 2))).toBe(1)
  })
})

describe('league table', () => {
  it('counts points, goals and form', () => {
    const t = standings([1, 2, 3], [m(1, 2, 3, 0), m(2, 3, 1, 1), m(3, 1, 2, 1)], PTS)
    expect(t.map((r) => [r.playerId, r.points, r.goalDiff])).toEqual([
      [3, 4, 1],
      [1, 3, 2],
      [2, 1, -3],
    ])
    expect(t[0].form).toEqual(['D', 'W'])
  })

  it('breaks ties on goal difference, goals scored, then head-to-head', () => {
    // 1 and 2 both win 2–0 against 3 and 4; 1 beat 2.
    const ms = [m(1, 3, 2, 0), m(2, 4, 2, 0), m(1, 2, 1, 0), m(2, 3, 2, 1), m(4, 1, 1, 0), m(3, 4, 0, 0)]
    const t = standings([1, 2, 3, 4], ms, PTS)
    expect(t.slice(0, 2).map((r) => [r.playerId, r.points, r.goalDiff, r.goalsFor])).toEqual([
      [2, 6, 2, 4],
      [1, 6, 2, 3],
    ])
    // Same points, GD and GF: head-to-head decides.
    const level = standings([5, 6], [m(5, 6, 2, 1), m(6, 5, 2, 1), m(5, 7, 0, 1), m(6, 7, 0, 1)], PTS)
    expect(level.map((r) => r.position)).toEqual([1, 1])
    const h2h = standings([5, 6, 7], [m(5, 6, 1, 0), m(5, 7, 0, 1), m(6, 7, 1, 0)], PTS)
    expect(h2h.map((r) => r.playerId).slice(0, 2)).toEqual([5, 6])
  })

  it('counts a shoot-out as a draw on the table', () => {
    const t = standings([1, 2], [m(1, 2, 1, 1, { decidedBy: 'penalties', homePens: 5, awayPens: 3 })], PTS)
    expect(t.map((r) => r.points)).toEqual([1, 1])
  })
})

describe('ratings', () => {
  it('is zero-sum and rewards upsets more than expected wins', () => {
    const { current, history } = ratings([1, 2, 3], [m(1, 2, 1, 0), m(1, 2, 1, 0), m(1, 2, 1, 0), m(2, 1, 1, 0)])
    expect([...current.values()].reduce((a, b) => a + b, 0)).toBe(3000)
    const deltas = history.get(1)!.map((h) => h.delta)
    expect(deltas[0]).toBe(16) // even match: K/2
    expect(deltas[1]).toBeLessThan(16) // now the favourite, so less to gain
    expect(-deltas[3]).toBeGreaterThan(16) // losing as the favourite costs more
  })

  it('weights big wins (World Football Elo margins)', () => {
    expect(marginMultiplier(1)).toBe(1)
    expect(marginMultiplier(2)).toBe(1.5)
    expect(marginMultiplier(-4)).toBe(1.875)
    expect(ratings([1, 2], [m(1, 2, 4, 0)]).current.get(1)).toBe(1030)
    expect(expectedScore(1200, 1000)).toBeCloseTo(0.76, 2)
  })

  it('stays zero-sum over a random season (fuzz)', () => {
    const ids = [1, 2, 3, 4, 5, 6]
    const ms = Array.from({ length: 300 }, () => {
      const [a, b] = [...ids].sort(() => Math.random() - 0.5)
      return m(a, b, Math.floor(Math.random() * 6), Math.floor(Math.random() * 6))
    })
    const { current } = ratings(ids, ms)
    expect([...current.values()].reduce((x, y) => x + y, 0)).toBe(6000)
  })
})

describe('player stats and records', () => {
  const ms = [m(1, 2, 3, 0, { homeClub: 'Real Madrid' }), m(1, 3, 2, 1, { homeClub: 'Real Madrid' }), m(2, 1, 0, 0, { awayClub: 'Arsenal' }), m(1, 2, 5, 1, { homeClub: 'Barcelona' }), m(3, 1, 2, 0)]
  it('summarises a player', () => {
    const s = playerStats(1, ms)
    expect(s).toMatchObject({ played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 4, cleanSheets: 2, winRate: 60, longestWinStreak: 2 })
    expect(s.streak).toEqual({ kind: 'L', length: 1 })
    expect(s.biggestWin).toMatchObject({ for: 5, against: 1 })
    expect(s.clubs[0]).toEqual({ club: 'Real Madrid', played: 2, won: 2 })
    expect(s.headToHead.find((h) => h.opponentId === 2)).toMatchObject({ played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 8, goalsAgainst: 1 })
  })
  it('finds crew records', () => {
    const r = records([1, 2, 3], ms)
    expect(r.biggestWin).toMatchObject({ winnerId: 1, for: 5, against: 1 })
    expect(r.mostGoals?.total).toBe(6)
    expect(r.longestWinStreak).toEqual({ playerId: 1, length: 2 })
    expect(r.topRivalry).toEqual({ a: 1, b: 2, played: 3 })
  })
})

describe('clubs', () => {
  it('has unique names and codes, and abbreviates unlisted teams', () => {
    expect(new Set(CLUBS.map((c) => c.name)).size).toBe(CLUBS.length)
    expect(new Set(CLUBS.map((c) => c.code)).size).toBe(CLUBS.length)
    expect(clubCode('real madrid')).toBe('RMA')
    expect(clubCode('Wolverhampton Wanderers')).toBe('WOL')
    expect(clubCode('Queens Park Rangers')).toBe('QPR')
  })
  it('fair spin gives two different clubs from the same tier, avoiding recent ones', () => {
    for (let i = 0; i < 200; i++) {
      const [a, b] = fairSpin(4.5, Math.random, ['Chelsea'])
      expect(a.stars).toBe(4.5)
      expect(b.stars).toBe(4.5)
      expect(a.name).not.toBe(b.name)
      expect([a.name, b.name]).not.toContain('Chelsea')
    }
  })
})
