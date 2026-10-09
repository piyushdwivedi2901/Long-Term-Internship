import { describe, expect, it } from 'vitest'
import { testServices } from './testing.ts'

async function setup() {
  const { services, repo } = testServices()
  const a = await services.auth.signup({ name: 'Piyush', email: 'piyush@example.com', password: 'password123' })
  const b = await services.auth.signup({ name: 'Rohan', email: 'rohan@example.com', password: 'password123' })
  const crew = services.crews.create(a.user.id, { name: 'Room 12', playerNames: ['Rohan', 'Aisha', 'Kabir', 'Meera'] })
  const [p, r, ai, k, me] = crew.players.map((x) => x.id)
  return { services, repo, me: a.user.id, other: b.user.id, crew, ids: { p, r, ai, k, me } }
}
const result = (homeGoals: number, awayGoals: number, extra = {}) => ({ homeGoals, awayGoals, homeClub: 'Real Madrid', awayClub: 'Arsenal', ...extra })

describe('crews and invites', () => {
  it('creates a crew with placeholder players in kit colours, and lets a friend claim one', async () => {
    const { services, crew, other, ids } = await setup()
    expect(crew.players.map((p) => [p.name, p.color, p.claimed])).toEqual([
      ['Piyush', 0, true],
      ['Rohan', 1, false],
      ['Aisha', 2, false],
      ['Kabir', 3, false],
      ['Meera', 4, false],
    ])
    expect(crew.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    const preview = services.crews.previewInvite(other, { code: crew.inviteCode.toLowerCase() })
    expect(preview.placeholders.map((p) => p.name)).toEqual(['Rohan', 'Aisha', 'Kabir', 'Meera'])
    const joined = services.crews.join(other, { code: crew.inviteCode, claimPlayerId: ids.r })
    expect(joined.players.find((p) => p.id === ids.r)).toMatchObject({ isYou: true, claimed: true })
    expect(() => services.crews.join(other, { code: 'AAAAAAAA' })).toThrow('No crew uses this invite code')
  })

  it("keeps crews private: outsiders get 404, never a hint", async () => {
    const { services, crew, other } = await setup()
    expect(() => services.crews.get(other, crew.id)).toThrow('Crew not found')
    expect(() => services.competitions.list(other, crew.id)).toThrow('Crew not found')
    expect(services.crews.list(other)).toEqual([])
  })
})

describe('leagues', () => {
  it('generates every fixture, tracks the table and crowns the champion when the last match is played', async () => {
    const { services, me, crew, ids } = await setup()
    const league = services.competitions.create(me, crew.id, { name: 'Season 1', format: 'league', playerIds: [ids.p, ids.r, ids.ai] })
    expect(league.rounds.flatMap((r) => r.matches)).toHaveLength(3)
    expect(league.rounds.map((r) => r.name)).toEqual(['Matchday 1', 'Matchday 2', 'Matchday 3'])
    const fixtures = league.rounds.flatMap((r) => r.matches)
    // Piyush wins everything.
    for (const f of fixtures) services.matches.record(me, f.id, f.homeId === ids.p ? result(2, 0) : f.awayId === ids.p ? result(0, 2) : result(1, 1))
    const done = services.competitions.get(me, league.id)
    expect(done).toMatchObject({ status: 'finished', championId: ids.p, played: 3, total: 3 })
    expect(done.table!.map((r) => [r.playerId, r.points])).toEqual([
      [ids.p, 6],
      [ids.r, 1],
      [ids.ai, 1],
    ])
    expect(done.awards.map((a) => a.title)).toEqual(['Golden Boot', 'Best defence', 'Biggest win'])
    expect(services.activity(me, crew.id)[0].text).toBe('🏆 Piyush won “Season 1”')

    // Clearing a result re-opens the season.
    services.matches.clear(me, fixtures[0].id)
    expect(services.competitions.get(me, league.id)).toMatchObject({ status: 'active', championId: null, played: 2 })
  })

  it('validates players and point systems', async () => {
    const { services, me, crew, ids } = await setup()
    expect(() => services.competitions.create(me, crew.id, { name: 'X', format: 'league', playerIds: [ids.p] })).toThrow('Pick at least two players')
    expect(() => services.competitions.create(me, crew.id, { name: 'X', format: 'league', playerIds: [ids.p, ids.p] })).toThrow('Pick each player once')
    expect(() => services.competitions.create(me, crew.id, { name: 'X', format: 'league', playerIds: [ids.p, 99999] })).toThrow('Pick players from this crew')
    expect(() => services.competitions.create(me, crew.id, { name: 'X', format: 'league', playerIds: [ids.p, ids.r], points: { win: 1, draw: 1, loss: 0 } })).toThrow('A win must be worth more')
  })
})

describe('knockouts', () => {
  it('gives the top seeds byes, advances winners and needs a shoot-out for a draw', async () => {
    const { services, me, crew, ids } = await setup()
    const cup = services.competitions.create(me, crew.id, { name: 'Cup', format: 'knockout', playerIds: [ids.p, ids.r, ids.ai, ids.k, ids.me], seeding: 'manual' })
    expect(cup.rounds.map((r) => r.name)).toEqual(['Quarter-finals', 'Semi-finals', 'Final'])
    const qf = cup.rounds[0].matches
    expect(qf.filter((m) => m.status === 'bye').map((m) => m.winnerId)).toEqual([ids.p, ids.r, ids.ai])
    const real = qf.find((m) => m.status === 'scheduled')!
    expect([real.homeId, real.awayId]).toEqual([ids.k, ids.me])
    expect(cup.total).toBe(4) // 1 QF + 2 SF + final

    expect(() => services.matches.record(me, real.id, result(1, 1))).toThrow('add the penalty shoot-out')
    expect(() => services.matches.record(me, real.id, result(1, 1, { decidedBy: 'penalties', homePens: 4, awayPens: 4 }))).toThrow('A shoot-out needs a winner')
    services.matches.record(me, real.id, result(1, 1, { decidedBy: 'penalties', homePens: 3, awayPens: 4 }))
    const semis = services.competitions.get(me, cup.id).rounds[1].matches
    expect([semis[0].homeId, semis[0].awayId]).toEqual([ids.p, ids.me]) // 1 v (4/5 winner)
    expect([semis[1].homeId, semis[1].awayId]).toEqual([ids.r, ids.ai])

    // Semis can't be played twice in a row before the final is known; final waits for both.
    const final = services.competitions.get(me, cup.id).rounds[2].matches[0]
    expect(() => services.matches.record(me, final.id, result(1, 0))).toThrow("Both players aren't known yet")
    services.matches.record(me, semis[0].id, result(3, 1))
    services.matches.record(me, semis[1].id, result(0, 2))
    services.matches.record(me, final.id, result(2, 1))
    expect(services.competitions.get(me, cup.id)).toMatchObject({ status: 'finished', championId: ids.p })
  })

  it('protects later rounds when an earlier result changes the winner', async () => {
    const { services, me, crew, ids } = await setup()
    const cup = services.competitions.create(me, crew.id, { name: 'Cup', format: 'knockout', playerIds: [ids.p, ids.r, ids.ai, ids.k], seeding: 'manual' })
    const [sf1, sf2] = cup.rounds[0].matches
    services.matches.record(me, sf1.id, result(2, 0)) // Piyush through
    services.matches.record(me, sf2.id, result(1, 0)) // Rohan through
    const final = services.competitions.get(me, cup.id).rounds[1].matches[0]
    services.matches.record(me, final.id, result(1, 0))
    // Same winner, new score: fine.
    services.matches.record(me, sf1.id, result(3, 0))
    // Different winner while the final is played: refused.
    expect(() => services.matches.record(me, sf1.id, result(0, 1))).toThrow('Clear the Final result first')
    services.matches.clear(me, final.id)
    services.matches.record(me, sf1.id, result(0, 1))
    const after = services.competitions.get(me, cup.id)
    expect(after.rounds[1].matches[0].homeId).toBe(ids.k)
    expect(after).toMatchObject({ status: 'active', championId: null })
  })

  it('seeds by rating by default', async () => {
    const { services, me, crew, ids } = await setup()
    // Make Kabir the strongest by rating.
    for (const opp of [ids.p, ids.r, ids.ai]) services.matches.friendly(me, crew.id, { homeId: ids.k, awayId: opp, ...result(4, 0) })
    const cup = services.competitions.create(me, crew.id, { name: 'Cup', format: 'knockout', playerIds: [ids.p, ids.r, ids.ai, ids.k] })
    expect(cup.playerIds[0]).toBe(ids.k)
    expect(cup.rounds[0].matches[0].homeId).toBe(ids.k)
  })
})

describe('friendlies, ratings and profiles', () => {
  it('rates every match and builds a profile with head-to-head', async () => {
    const { services, me, crew, ids } = await setup()
    const f = services.matches.friendly(me, crew.id, { homeId: ids.p, awayId: ids.r, ...result(3, 0) })
    expect(f).toMatchObject({ roundLabel: 'Friendly', ratingDelta: 28 }) // 32 × 1.75 (3-goal margin) × 0.5
    services.matches.friendly(me, crew.id, { homeId: ids.r, awayId: ids.p, ...result(1, 1) })
    const prof = services.players.profile(me, crew.id, ids.p)
    expect(prof).toMatchObject({ rank: 1, played: 2, won: 1, drawn: 1, goalsFor: 4, goalsAgainst: 1, peakRating: 1028 })
    expect(prof.headToHead[0]).toMatchObject({ opponentId: ids.r, played: 2, won: 1, drawn: 1 })
    expect(prof.clubs[0]).toMatchObject({ club: 'Real Madrid' })
    const detail = services.crews.get(me, crew.id)
    expect(detail.leaderboard[0]).toMatchObject({ playerId: ids.p, rank: 1 })
    expect(detail.recent).toHaveLength(2)
    expect(() => services.matches.friendly(me, crew.id, { homeId: ids.p, awayId: ids.p, ...result(1, 0) })).toThrow('Pick two different players')
    services.matches.clear(me, f.id) // friendlies are deleted
    expect(services.matches.list(me, crew.id)).toHaveLength(1)
  })

  it("won't remove a player who has played, and protects claimed names", async () => {
    const { services, me, crew, ids, other } = await setup()
    services.matches.friendly(me, crew.id, { homeId: ids.p, awayId: ids.r, ...result(1, 0) })
    expect(() => services.players.remove(me, crew.id, ids.r)).toThrow("has played matches")
    services.players.remove(me, crew.id, ids.me)
    services.crews.join(other, { code: crew.inviteCode, claimPlayerId: ids.r })
    expect(() => services.players.update(me, crew.id, ids.r, { name: 'Ro' })).toThrow('only they can change their name')
    expect(services.players.update(me, crew.id, ids.r, { name: 'Rohan', color: 7 }).color).toBe(7)
  })
})

describe('sample crew', () => {
  it('tells the same story every time', async () => {
    const { services } = testServices()
    const u = (await services.auth.signup({ name: 'Demo', email: 'demo@example.com', password: 'password123' })).user.id
    const [crew] = services.seedSample(u)
    const d = services.crews.get(u, crew.id)
    expect(d.name).toBe('Hostel Room 12')
    expect(d.competitions.map((c) => [c.name, c.status, c.played, c.total])).toEqual([
      ['Season 2', 'active', 6, 30],
      ['Diwali Cup', 'active', 3, 5],
      ['Season 1', 'finished', 15, 15],
    ])
    expect(d.upcoming.length).toBeGreaterThan(0)
    const ratings = d.leaderboard.map((r) => r.rating)
    expect(ratings.reduce((a, b) => a + b, 0)).toBe(6000)
    expect(d.records.biggestWin).not.toBeNull()
  })
})
