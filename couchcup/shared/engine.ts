/**
 * Tables, ratings and stats — pure functions over played matches, so the
 * server, the in-browser demo and the tests all agree on every number.
 */
export type DecidedBy = 'normal' | 'extra_time' | 'penalties' | 'forfeit'

export interface PlayedMatch {
  id: number
  homeId: number
  awayId: number
  homeGoals: number
  awayGoals: number
  decidedBy: DecidedBy
  homePens: number | null
  awayPens: number | null
  homeClub: string
  awayClub: string
  /** ISO timestamp; ties broken by id */
  playedAt: string
}

export type Outcome = 'W' | 'D' | 'L'

/** Result for one side. A penalty shoot-out counts as a draw on the record, as in real football. */
export function outcomeFor(m: PlayedMatch, playerId: number): Outcome {
  const mine = m.homeId === playerId ? m.homeGoals : m.awayGoals
  const theirs = m.homeId === playerId ? m.awayGoals : m.homeGoals
  return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D'
}

/** Who goes through — the shoot-out decides a level knockout match. */
export function winnerOf(m: Pick<PlayedMatch, 'homeId' | 'awayId' | 'homeGoals' | 'awayGoals' | 'homePens' | 'awayPens'>): number | null {
  if (m.homeGoals !== m.awayGoals) return m.homeGoals > m.awayGoals ? m.homeId : m.awayId
  if (m.homePens !== null && m.awayPens !== null && m.homePens !== m.awayPens) return m.homePens > m.awayPens ? m.homeId : m.awayId
  return null
}

export const chronological = <T extends { playedAt: string; id: number }>(ms: T[]) => [...ms].sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id - b.id)

// ---------------------------------------------------------------- standings
export interface Points {
  win: number
  draw: number
  loss: number
}
export interface TableRow {
  playerId: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  /** last five results, oldest first */
  form: Outcome[]
  position: number
}

function tally(ids: number[], matches: PlayedMatch[], pts: Points): Map<number, TableRow> {
  const rows = new Map<number, TableRow>(
    ids.map((id) => [id, { playerId: id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, form: [], position: 0 }]),
  )
  for (const m of chronological(matches)) {
    for (const [me, gf, ga] of [
      [m.homeId, m.homeGoals, m.awayGoals],
      [m.awayId, m.awayGoals, m.homeGoals],
    ] as const) {
      const r = rows.get(me)
      if (!r) continue
      const o = outcomeFor(m, me)
      r.played++
      r.goalsFor += gf
      r.goalsAgainst += ga
      if (o === 'W') (r.won++, (r.points += pts.win))
      else if (o === 'D') (r.drawn++, (r.points += pts.draw))
      else (r.lost++, (r.points += pts.loss))
      r.form = [...r.form, o].slice(-5)
    }
  }
  for (const r of rows.values()) r.goalDiff = r.goalsFor - r.goalsAgainst
  return rows
}

/**
 * League table. Ties are broken by goal difference, then goals scored, then
 * a mini-table of the matches between the tied players, then wins.
 */
export function standings(ids: number[], matches: PlayedMatch[], pts: Points): TableRow[] {
  const rows = tally(ids, matches, pts)
  const key = (r: TableRow) => `${r.points}|${r.goalDiff}|${r.goalsFor}`
  const groups = new Map<string, number[]>()
  for (const r of rows.values()) groups.set(key(r), [...(groups.get(key(r)) ?? []), r.playerId])
  const h2h = new Map<number, TableRow>()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const inGroup = new Set(group)
    const mini = tally(group, matches.filter((m) => inGroup.has(m.homeId) && inGroup.has(m.awayId)), pts)
    for (const [id, r] of mini) h2h.set(id, r)
  }
  const sorted = [...rows.values()].sort((a, b) => {
    const ha = h2h.get(a.playerId)
    const hb = h2h.get(b.playerId)
    return (
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      (ha && hb ? hb.points - ha.points || hb.goalDiff - ha.goalDiff || hb.goalsFor - ha.goalsFor : 0) ||
      b.won - a.won ||
      ids.indexOf(a.playerId) - ids.indexOf(b.playerId)
    )
  })
  // Shared positions only when truly inseparable (same points, GD, GF and head-to-head).
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1]
    const same = prev && key(prev) === key(r) && (h2h.get(prev.playerId)?.points ?? 0) === (h2h.get(r.playerId)?.points ?? 0) && prev.won === r.won
    r.position = same ? prev.position : i + 1
  })
  return sorted
}

// ---------------------------------------------------------------- ratings
export const START_RATING = 1000
const K = 32

/**
 * Margin of victory weighting from the World Football Elo ratings: a 4–0
 * moves ratings more than a 1–0.
 */
export function marginMultiplier(goalDiff: number): number {
  const n = Math.abs(goalDiff)
  return n <= 1 ? 1 : n === 2 ? 1.5 : (11 + n) / 8
}

export const expectedScore = (rating: number, opponent: number) => 1 / (1 + 10 ** ((opponent - rating) / 400))

export interface RatingPoint {
  matchId: number
  playedAt: string
  rating: number
  delta: number
}

/**
 * Elo for every player over every played match in order. Ratings are
 * zero-sum: whatever one player gains, the opponent loses.
 */
export function ratings(ids: number[], matches: PlayedMatch[]): { current: Map<number, number>; history: Map<number, RatingPoint[]> } {
  const current = new Map(ids.map((id) => [id, START_RATING]))
  const history = new Map<number, RatingPoint[]>(ids.map((id) => [id, []]))
  for (const m of chronological(matches)) {
    if (!current.has(m.homeId) || !current.has(m.awayId)) continue
    const rh = current.get(m.homeId)!
    const ra = current.get(m.awayId)!
    const score = m.homeGoals > m.awayGoals ? 1 : m.homeGoals < m.awayGoals ? 0 : 0.5
    const delta = Math.round(K * marginMultiplier(m.homeGoals - m.awayGoals) * (score - expectedScore(rh, ra)))
    current.set(m.homeId, rh + delta)
    current.set(m.awayId, ra - delta)
    history.get(m.homeId)!.push({ matchId: m.id, playedAt: m.playedAt, rating: rh + delta, delta })
    history.get(m.awayId)!.push({ matchId: m.id, playedAt: m.playedAt, rating: ra - delta, delta: -delta })
  }
  return { current, history }
}

// ---------------------------------------------------------------- stats
export interface HeadToHead {
  opponentId: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}
export interface ClubUse {
  club: string
  played: number
  won: number
}
export interface PlayerStats {
  playerId: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets: number
  /** 0–100, rounded */
  winRate: number
  /** e.g. { kind: 'W', length: 3 } — the run they're on now */
  streak: { kind: Outcome; length: number } | null
  longestWinStreak: number
  biggestWin: { matchId: number; for: number; against: number } | null
  form: Outcome[]
  clubs: ClubUse[]
  headToHead: HeadToHead[]
}

export function playerStats(playerId: number, matches: PlayedMatch[]): PlayerStats {
  const mine = chronological(matches.filter((m) => m.homeId === playerId || m.awayId === playerId))
  const s: PlayerStats = {
    playerId,
    played: mine.length,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    winRate: 0,
    streak: null,
    longestWinStreak: 0,
    biggestWin: null,
    form: [],
    clubs: [],
    headToHead: [],
  }
  const clubs = new Map<string, ClubUse>()
  const h2h = new Map<number, HeadToHead>()
  let run = 0
  for (const m of mine) {
    const home = m.homeId === playerId
    const gf = home ? m.homeGoals : m.awayGoals
    const ga = home ? m.awayGoals : m.homeGoals
    const opp = home ? m.awayId : m.homeId
    const club = (home ? m.homeClub : m.awayClub).trim()
    const o = outcomeFor(m, playerId)
    s.goalsFor += gf
    s.goalsAgainst += ga
    if (ga === 0) s.cleanSheets++
    if (o === 'W') s.won++
    else if (o === 'D') s.drawn++
    else s.lost++
    run = o === 'W' ? run + 1 : 0
    s.longestWinStreak = Math.max(s.longestWinStreak, run)
    if (o === 'W' && (!s.biggestWin || gf - ga > s.biggestWin.for - s.biggestWin.against || (gf - ga === s.biggestWin.for - s.biggestWin.against && gf > s.biggestWin.for))) {
      s.biggestWin = { matchId: m.id, for: gf, against: ga }
    }
    s.streak = s.streak && s.streak.kind === o ? { kind: o, length: s.streak.length + 1 } : { kind: o, length: 1 }
    if (club) {
      const c = clubs.get(club) ?? { club, played: 0, won: 0 }
      c.played++
      if (o === 'W') c.won++
      clubs.set(club, c)
    }
    const h = h2h.get(opp) ?? { opponentId: opp, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }
    h.played++
    h.goalsFor += gf
    h.goalsAgainst += ga
    if (o === 'W') h.won++
    else if (o === 'D') h.drawn++
    else h.lost++
    h2h.set(opp, h)
  }
  s.winRate = s.played ? Math.round((s.won / s.played) * 100) : 0
  s.form = mine.slice(-5).map((m) => outcomeFor(m, playerId))
  s.clubs = [...clubs.values()].sort((a, b) => b.played - a.played || b.won - a.won || a.club.localeCompare(b.club))
  s.headToHead = [...h2h.values()].sort((a, b) => b.played - a.played || a.opponentId - b.opponentId)
  return s
}

export interface Records {
  biggestWin: { matchId: number; winnerId: number; loserId: number; for: number; against: number } | null
  mostGoals: { matchId: number; total: number } | null
  longestWinStreak: { playerId: number; length: number } | null
  topRivalry: { a: number; b: number; played: number } | null
}

export function records(ids: number[], matches: PlayedMatch[]): Records {
  const r: Records = { biggestWin: null, mostGoals: null, longestWinStreak: null, topRivalry: null }
  const pairs = new Map<string, number>()
  for (const m of chronological(matches)) {
    const diff = Math.abs(m.homeGoals - m.awayGoals)
    if (diff > 0 && (!r.biggestWin || diff > r.biggestWin.for - r.biggestWin.against)) {
      const homeWon = m.homeGoals > m.awayGoals
      r.biggestWin = { matchId: m.id, winnerId: homeWon ? m.homeId : m.awayId, loserId: homeWon ? m.awayId : m.homeId, for: Math.max(m.homeGoals, m.awayGoals), against: Math.min(m.homeGoals, m.awayGoals) }
    }
    const total = m.homeGoals + m.awayGoals
    if (total > 0 && (!r.mostGoals || total > r.mostGoals.total)) r.mostGoals = { matchId: m.id, total }
    const k = [Math.min(m.homeId, m.awayId), Math.max(m.homeId, m.awayId)].join('-')
    pairs.set(k, (pairs.get(k) ?? 0) + 1)
  }
  for (const id of ids) {
    const len = playerStats(id, matches).longestWinStreak
    if (len > 1 && (!r.longestWinStreak || len > r.longestWinStreak.length)) r.longestWinStreak = { playerId: id, length: len }
  }
  for (const [k, played] of pairs) {
    if (played > 1 && (!r.topRivalry || played > r.topRivalry.played)) {
      const [a, b] = k.split('-').map(Number)
      r.topRivalry = { a, b, played }
    }
  }
  return r
}
