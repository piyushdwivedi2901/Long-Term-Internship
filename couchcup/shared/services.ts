import { AppError, notFound, parse, unauthorized } from './errors.ts'
import { chronological, playerStats, ratings, records, standings, START_RATING, winnerOf, type PlayedMatch } from './engine.ts'
import { knockoutFirstRound, nextSlot, roundCount, roundName, roundRobin } from './fixtures.ts'
import type { CompetitionRow, CrewRow, MatchRow, PlayerRow, Repository, UserRow } from './repository.ts'
import {
  KIT_COLORS,
  MAX_PLAYERS,
  competitionPatchSchema,
  competitionSchema,
  crewPatchSchema,
  crewSchema,
  deleteAccountSchema,
  friendlySchema,
  joinSchema,
  loginSchema,
  playerSchema,
  profileSchema,
  resultSchema,
  signupSchema,
  type ResultInput,
} from './schemas.ts'
import type {
  Activity,
  Award,
  CompetitionDetail,
  CompetitionSummary,
  CrewDetail,
  CrewSummary,
  JoinPreview,
  LeaderRow,
  Match,
  Overview,
  Player,
  PlayerProfile,
  Session,
  User,
} from './types.ts'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}
export interface TokenSigner {
  sign(user: { id: number; email: string }): string
  verify(token: string): number | null
}
export interface ServiceDeps {
  repo: Repository
  passwords: PasswordHasher
  tokens: TokenSigner
  now?: () => Date
  randomBytes?: (n: number) => Uint8Array
  /** for random seeding (override in tests) */
  random?: () => number
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I — easy to read out across a room
const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })
const score = (m: { homeGoals: number | null; awayGoals: number | null; homePens: number | null; awayPens: number | null }) =>
  `${m.homeGoals}–${m.awayGoals}${m.homePens !== null ? ` (${m.homePens}–${m.awayPens} pens)` : ''}`

/** Deterministic PRNG for the sample data, so every demo looks the same. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Every Couch Cup rule. Methods take the acting user's id first; access is
 * decided here, once: you can only see and change crews you belong to.
 */
export function createServices({
  repo,
  passwords,
  tokens,
  now = () => new Date(),
  randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n)),
  random = Math.random,
}: ServiceDeps) {
  const stamp = () => now().toISOString()

  // ---------------------------------------------------------------- helpers
  const newInviteCode = () => {
    for (;;) {
      const code = Array.from(randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
      if (!repo.crews.byInviteCode(code)) return code
    }
  }

  /** The user's player in a crew, or 404 — never reveal other crews. */
  const membership = (userId: number, crewId: number): { crew: CrewRow; me: PlayerRow } => {
    const crew = repo.crews.byId(crewId)
    const me = crew && repo.players.listByCrew(crewId).find((p) => p.userId === userId)
    if (!crew || !me) throw notFound('Crew')
    return { crew, me }
  }

  const log = (crewId: number, userId: number, actorName: string, text: string) => {
    repo.activity.insert({ crewId, userId, actorName, text, createdAt: stamp() })
    repo.crews.update(crewId, { updatedAt: stamp() })
  }

  const toPlayed = (m: MatchRow): PlayedMatch => ({
    id: m.id,
    homeId: m.homeId!,
    awayId: m.awayId!,
    homeGoals: m.homeGoals!,
    awayGoals: m.awayGoals!,
    decidedBy: m.decidedBy ?? 'normal',
    homePens: m.homePens,
    awayPens: m.awayPens,
    homeClub: m.homeClub,
    awayClub: m.awayClub,
    playedAt: m.playedAt!,
  })
  const played = (ms: MatchRow[]) => ms.filter((m) => m.status === 'played').map(toPlayed)

  const nameOf = (players: PlayerRow[], id: number | null) => players.find((p) => p.id === id)?.name ?? 'TBD'

  /** Everything rating-related for a crew, computed once per request. */
  const crewContext = (crewId: number) => {
    const players = repo.players.listByCrew(crewId)
    const matches = repo.matches.listByCrew(crewId)
    const comps = repo.competitions.listByCrew(crewId)
    const ids = players.map((p) => p.id)
    const pm = played(matches)
    const r = ratings(ids, pm)
    const homeDelta = new Map<number, number>()
    for (const m of pm) {
      const point = r.history.get(m.homeId)?.find((h) => h.matchId === m.id)
      if (point) homeDelta.set(m.id, point.delta)
    }
    const compById = new Map(comps.map((c) => [c.id, c]))
    const ranked = [...ids].sort((a, b) => r.current.get(b)! - r.current.get(a)! || a - b)
    return { players, matches, comps, compById, ids, pm, ratings: r, homeDelta, ranked }
  }
  type Ctx = ReturnType<typeof crewContext>

  const roundLabel = (m: MatchRow, comp: CompetitionRow | undefined) => {
    if (!comp) return 'Friendly'
    if (comp.format === 'league') return `Matchday ${m.round}`
    return roundName(m.round, roundCount(comp.playerIds.length))
  }

  const toMatch = (m: MatchRow, ctx: Ctx): Match => {
    const comp = m.competitionId ? ctx.compById.get(m.competitionId) : undefined
    return {
      id: m.id,
      competitionId: m.competitionId,
      competitionName: comp?.name ?? null,
      roundLabel: roundLabel(m, comp),
      round: m.round,
      slot: m.slot,
      homeId: m.homeId,
      awayId: m.awayId,
      homeClub: m.homeClub,
      awayClub: m.awayClub,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      homePens: m.homePens,
      awayPens: m.awayPens,
      decidedBy: m.decidedBy,
      status: m.status,
      playedAt: m.playedAt,
      notes: m.notes,
      winnerId: m.status === 'played' ? winnerOf(toPlayed(m)) : m.status === 'bye' ? (m.homeId ?? m.awayId) : null,
      ratingDelta: ctx.homeDelta.get(m.id) ?? null,
    }
  }

  const toPlayer = (p: PlayerRow, crew: CrewRow, userId: number, ctx: Ctx): Player => ({
    id: p.id,
    name: p.name,
    color: p.color,
    claimed: p.userId !== null,
    isYou: p.userId === userId,
    isOwner: p.userId === crew.ownerId,
    rating: ctx.ratings.current.get(p.id) ?? START_RATING,
  })

  const crewSummary = (crew: CrewRow, me: PlayerRow, ctx: Ctx): CrewSummary => ({
    id: crew.id,
    name: crew.name,
    playerCount: ctx.players.length,
    matchCount: ctx.pm.length,
    activeCompetitions: ctx.comps.filter((c) => c.status === 'active').length,
    myPlayerId: me.id,
    myRating: ctx.ratings.current.get(me.id) ?? START_RATING,
    myRank: ctx.ranked.indexOf(me.id) + 1,
    isOwner: crew.ownerId === me.userId,
    updatedAt: crew.updatedAt,
  })

  /** Players still in a knockout: everyone who hasn't lost a decided match. */
  const stillIn = (comp: CompetitionRow, matches: MatchRow[]) => {
    const out = new Set<number>()
    for (const m of matches) {
      if (m.status !== 'played') continue
      const w = winnerOf(toPlayed(m))
      if (w !== null) out.add(w === m.homeId ? m.awayId! : m.homeId!)
    }
    return comp.playerIds.filter((id) => !out.has(id))
  }

  const compSummary = (comp: CompetitionRow, matches: MatchRow[]): CompetitionSummary => {
    const own = matches.filter((m) => m.competitionId === comp.id)
    const playedHere = own.filter((m) => m.status === 'played')
    let leaderId: number | null = comp.championId
    if (leaderId === null && playedHere.length) {
      leaderId = comp.format === 'league' ? standings(comp.playerIds, played(own), comp.points)[0].playerId : (stillIn(comp, own)[0] ?? null)
    }
    return {
      id: comp.id,
      name: comp.name,
      format: comp.format,
      status: comp.status,
      playerCount: comp.playerIds.length,
      played: playedHere.length,
      total: own.filter((m) => m.status !== 'bye').length,
      championId: comp.championId,
      leaderId,
      createdAt: comp.createdAt,
    }
  }

  const assertPlayers = (crewId: number, ids: number[], field: string) => {
    const valid = new Set(repo.players.listByCrew(crewId).map((p) => p.id))
    if (ids.some((id) => !valid.has(id))) throw new AppError(400, 'validation', 'Pick players from this crew', { [field]: 'Pick players from this crew' })
  }

  const ownMatch = (userId: number, matchId: number) => {
    const match = repo.matches.byId(matchId)
    if (!match) throw notFound('Match')
    const { crew, me } = membership(userId, match.crewId)
    return { match, crew, me }
  }

  // ---------------------------------------------------------------- auth
  const auth = {
    async signup(input: unknown): Promise<Session> {
      const data = parse(signupSchema, input)
      if (repo.users.byEmail(data.email)) throw new AppError(409, 'email_taken', 'An account with this email already exists', { email: 'An account with this email already exists' })
      const row = repo.users.insert({ name: data.name, email: data.email, passwordHash: await passwords.hash(data.password), createdAt: stamp() })
      return { token: tokens.sign(row), user: toUser(row) }
    },
    async login(input: unknown): Promise<Session> {
      const data = parse(loginSchema, input)
      const row = repo.users.byEmail(data.email)
      const ok = row ? await passwords.verify(data.password, row.passwordHash) : false
      if (!row || !ok) throw new AppError(401, 'bad_credentials', 'Email or password is incorrect')
      return { token: tokens.sign(row), user: toUser(row) }
    },
    authenticate(token: string | null | undefined): number {
      const id = token ? tokens.verify(token) : null
      if (id === null || !repo.users.byId(id)) throw unauthorized('Your session has ended. Sign in again.')
      return id
    },
    me(userId: number): User {
      const u = repo.users.byId(userId)
      if (!u) throw unauthorized()
      return toUser(u)
    },
    updateProfile(userId: number, input: unknown): User {
      const { name } = parse(profileSchema, input)
      repo.transaction(() => {
        repo.users.update(userId, { name })
        // Your name follows you into every crew, unless someone there already uses it.
        for (const p of repo.players.listByUser(userId)) {
          const clash = repo.players.listByCrew(p.crewId).some((o) => o.id !== p.id && o.name.toLowerCase() === name.toLowerCase())
          if (!clash) repo.players.update(p.id, { name })
        }
      })
      return auth.me(userId)
    },
    /** Results stay: your players become unclaimed so friends' tables don't change. */
    async deleteAccount(userId: number, input: unknown): Promise<void> {
      const { password } = parse(deleteAccountSchema, input)
      const u = repo.users.byId(userId)
      if (!u) throw unauthorized()
      if (!(await passwords.verify(password, u.passwordHash))) throw new AppError(400, 'bad_password', 'That password is incorrect', { password: 'That password is incorrect' })
      repo.transaction(() => {
        for (const p of repo.players.listByUser(userId)) {
          const crew = repo.crews.byId(p.crewId)!
          const others = repo.players.listByCrew(crew.id).filter((x) => x.userId !== null && x.userId !== userId)
          if (crew.ownerId === userId && others.length === 0) deleteCrew(crew.id)
          else {
            repo.players.update(p.id, { userId: null })
            if (crew.ownerId === userId) repo.crews.update(crew.id, { ownerId: others[0].userId! })
          }
        }
        repo.users.delete(userId)
      })
    },
  }

  function deleteCrew(crewId: number) {
    for (const m of repo.matches.listByCrew(crewId)) repo.matches.delete(m.id)
    for (const c of repo.competitions.listByCrew(crewId)) repo.competitions.delete(c.id)
    for (const p of repo.players.listByCrew(crewId)) repo.players.delete(p.id)
    for (const a of repo.activity.listByCrews([crewId], Number.MAX_SAFE_INTEGER)) repo.activity.delete(a.id)
    repo.crews.delete(crewId)
  }

  // ---------------------------------------------------------------- crews
  const crews = {
    list(userId: number): CrewSummary[] {
      return repo.players
        .listByUser(userId)
        .map((me) => crewSummary(repo.crews.byId(me.crewId)!, me, crewContext(me.crewId)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)
    },

    get(userId: number, crewId: number): CrewDetail {
      const { crew, me } = membership(userId, crewId)
      const ctx = crewContext(crewId)
      const leaderboard: LeaderRow[] = ctx.ranked.map((id, i) => {
        const s = playerStats(id, ctx.pm)
        const hist = ctx.ratings.history.get(id) ?? []
        return {
          playerId: id,
          rank: i + 1,
          rating: ctx.ratings.current.get(id)!,
          trend: hist.slice(-5).reduce((n, h) => n + h.delta, 0),
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          form: s.form,
        }
      })
      const active = new Set(ctx.comps.filter((c) => c.status === 'active').map((c) => c.id))
      return {
        ...crewSummary(crew, me, ctx),
        inviteCode: crew.inviteCode,
        players: ctx.players.map((p) => toPlayer(p, crew, userId, ctx)),
        leaderboard,
        competitions: ctx.comps.map((c) => compSummary(c, ctx.matches)).sort((a, b) => (a.status === b.status ? b.id - a.id : a.status === 'active' ? -1 : 1)),
        recent: chronological(ctx.matches.filter((m) => m.status === 'played') as (MatchRow & { playedAt: string })[])
          .reverse()
          .slice(0, 8)
          .map((m) => toMatch(m, ctx)),
        upcoming: ctx.matches
          .filter((m) => m.status === 'scheduled' && m.homeId !== null && m.awayId !== null && m.competitionId !== null && active.has(m.competitionId))
          .sort((a, b) => a.competitionId! - b.competitionId! || a.round - b.round || a.slot - b.slot)
          .slice(0, 6)
          .map((m) => toMatch(m, ctx)),
        records: records(ctx.ids, ctx.pm),
      }
    },

    create(userId: number, input: unknown): CrewDetail {
      const data = parse(crewSchema, input)
      const me = auth.me(userId)
      const names = data.playerNames.filter((n) => n.toLowerCase() !== me.name.toLowerCase())
      if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
        throw new AppError(400, 'validation', 'Each player needs a different name', { playerNames: 'Each player needs a different name' })
      }
      const ts = stamp()
      const id = repo.transaction(() => {
        const crew = repo.crews.insert({ name: data.name, ownerId: userId, inviteCode: newInviteCode(), createdAt: ts, updatedAt: ts })
        repo.players.insert({ crewId: crew.id, userId, name: me.name, color: 0, createdAt: ts })
        names.forEach((name, i) => repo.players.insert({ crewId: crew.id, userId: null, name, color: (i + 1) % KIT_COLORS.length, createdAt: ts }))
        log(crew.id, userId, me.name, `started the crew “${crew.name}”`)
        return crew.id
      })
      return crews.get(userId, id)
    },

    update(userId: number, crewId: number, input: unknown): CrewDetail {
      const { name } = parse(crewPatchSchema, input)
      const { crew, me } = membership(userId, crewId)
      if (crew.ownerId !== userId) throw new AppError(403, 'forbidden', 'Only the person who started the crew can rename it')
      repo.transaction(() => {
        repo.crews.update(crewId, { name, updatedAt: stamp() })
        log(crewId, userId, me.name, `renamed the crew to “${name}”`)
      })
      return crews.get(userId, crewId)
    },

    remove(userId: number, crewId: number): void {
      const { crew } = membership(userId, crewId)
      if (crew.ownerId !== userId) throw new AppError(403, 'forbidden', 'Only the person who started the crew can delete it')
      repo.transaction(() => deleteCrew(crewId))
    },

    regenerateInvite(userId: number, crewId: number): CrewDetail {
      const { crew } = membership(userId, crewId)
      if (crew.ownerId !== userId) throw new AppError(403, 'forbidden', 'Only the person who started the crew can change the invite code')
      repo.crews.update(crewId, { inviteCode: newInviteCode() })
      return crews.get(userId, crewId)
    },

    previewInvite(userId: number, input: unknown): JoinPreview {
      const { code } = parse(joinSchema, input)
      const crew = repo.crews.byInviteCode(code)
      if (!crew) throw new AppError(404, 'bad_code', 'No crew uses this invite code. Check it with whoever sent it.', { code: 'No crew uses this invite code' })
      const players = repo.players.listByCrew(crew.id)
      return {
        crewId: crew.id,
        name: crew.name,
        playerCount: players.length,
        alreadyMember: players.some((p) => p.userId === userId),
        placeholders: players.filter((p) => p.userId === null).map((p) => ({ id: p.id, name: p.name })),
      }
    },

    /** Join by code — optionally as an existing player, taking over their results. */
    join(userId: number, input: unknown): CrewDetail {
      const { code, claimPlayerId } = parse(joinSchema, input)
      const preview = crews.previewInvite(userId, { code })
      if (preview.alreadyMember) return crews.get(userId, preview.crewId)
      const me = auth.me(userId)
      repo.transaction(() => {
        const players = repo.players.listByCrew(preview.crewId)
        if (claimPlayerId) {
          const target = players.find((p) => p.id === claimPlayerId)
          if (!target || target.userId !== null) throw new AppError(409, 'already_claimed', 'Someone has already joined as that player. Join as yourself instead.')
          repo.players.update(target.id, { userId })
          log(preview.crewId, userId, target.name, 'joined the crew')
        } else {
          if (players.length >= MAX_PLAYERS) throw new AppError(409, 'crew_full', `This crew already has ${MAX_PLAYERS} players`)
          let name = me.name
          for (let n = 2; players.some((p) => p.name.toLowerCase() === name.toLowerCase()); n++) name = `${me.name} ${n}`
          const used = new Set(players.map((p) => p.color))
          const color = KIT_COLORS.findIndex((_, i) => !used.has(i))
          repo.players.insert({ crewId: preview.crewId, userId, name, color: color === -1 ? players.length % KIT_COLORS.length : color, createdAt: stamp() })
          log(preview.crewId, userId, name, 'joined the crew')
        }
      })
      return crews.get(userId, preview.crewId)
    },

    /** Leaving keeps your player (unclaimed) so tables and ratings don't change. */
    leave(userId: number, crewId: number): void {
      const { crew, me } = membership(userId, crewId)
      if (crew.ownerId === userId) throw new AppError(409, 'owner_cannot_leave', 'You started this crew. Delete it instead, or hand it over by leaving after someone else.')
      repo.transaction(() => {
        repo.players.update(me.id, { userId: null })
        log(crewId, userId, me.name, 'left the crew')
      })
    },
  }

  // ---------------------------------------------------------------- players
  const players = {
    add(userId: number, crewId: number, input: unknown): Player {
      const data = parse(playerSchema, input)
      const { crew, me } = membership(userId, crewId)
      const existing = repo.players.listByCrew(crewId)
      if (existing.length >= MAX_PLAYERS) throw new AppError(409, 'crew_full', `A crew can have up to ${MAX_PLAYERS} players`)
      if (existing.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) {
        throw new AppError(409, 'duplicate_name', `${data.name} is already in this crew`, { name: `${data.name} is already in this crew` })
      }
      const used = new Set(existing.map((p) => p.color))
      const free = KIT_COLORS.findIndex((_, i) => !used.has(i))
      const color = data.color ?? (free === -1 ? existing.length % KIT_COLORS.length : free)
      const row = repo.transaction(() => {
        const r = repo.players.insert({ crewId, userId: null, name: data.name, color, createdAt: stamp() })
        log(crewId, userId, me.name, `added ${data.name}`)
        return r
      })
      return toPlayer(row, crew, userId, crewContext(crewId))
    },

    update(userId: number, crewId: number, playerId: number, input: unknown): Player {
      const data = parse(playerSchema, input)
      const { crew, me } = membership(userId, crewId)
      const target = repo.players.byId(playerId)
      if (!target || target.crewId !== crewId) throw notFound('Player')
      if (data.name !== target.name) {
        if (target.userId !== null && target.userId !== userId) throw new AppError(403, 'forbidden', `${target.name} has an account — only they can change their name`)
        if (repo.players.listByCrew(crewId).some((p) => p.id !== playerId && p.name.toLowerCase() === data.name.toLowerCase())) {
          throw new AppError(409, 'duplicate_name', `${data.name} is already in this crew`, { name: `${data.name} is already in this crew` })
        }
      }
      repo.transaction(() => {
        repo.players.update(playerId, { name: data.name, ...(data.color !== undefined ? { color: data.color } : {}) })
        if (data.name !== target.name) log(crewId, userId, me.name, `renamed ${target.name} to ${data.name}`)
      })
      return toPlayer(repo.players.byId(playerId)!, crew, userId, crewContext(crewId))
    },

    /** Only players with no matches can be removed — results are never rewritten. */
    remove(userId: number, crewId: number, playerId: number): void {
      const { me } = membership(userId, crewId)
      const target = repo.players.byId(playerId)
      if (!target || target.crewId !== crewId) throw notFound('Player')
      if (target.userId !== null) throw new AppError(409, 'has_account', `${target.name} has an account. They can leave the crew themselves.`)
      const used =
        repo.matches.listByCrew(crewId).some((m) => m.homeId === playerId || m.awayId === playerId) ||
        repo.competitions.listByCrew(crewId).some((c) => c.playerIds.includes(playerId))
      if (used) throw new AppError(409, 'in_use', `${target.name} has played matches, so they can't be removed`)
      repo.transaction(() => {
        repo.players.delete(playerId)
        log(crewId, userId, me.name, `removed ${target.name}`)
      })
    },

    profile(userId: number, crewId: number, playerId: number): PlayerProfile {
      const { crew } = membership(userId, crewId)
      const ctx = crewContext(crewId)
      const p = ctx.players.find((x) => x.id === playerId)
      if (!p) throw notFound('Player')
      const s = playerStats(playerId, ctx.pm)
      const history = ctx.ratings.history.get(playerId) ?? []
      const { playerId: _id, ...rest } = s
      void _id
      return {
        player: toPlayer(p, crew, userId, ctx),
        rank: ctx.ranked.indexOf(playerId) + 1,
        peakRating: Math.max(START_RATING, ...history.map((h) => h.rating)),
        history,
        ...rest,
        trophies: ctx.comps.filter((c) => c.championId === playerId).map((c) => ({ competitionId: c.id, name: c.name })),
        recent: chronological(ctx.matches.filter((m) => m.status === 'played' && (m.homeId === playerId || m.awayId === playerId)) as (MatchRow & { playedAt: string })[])
          .reverse()
          .slice(0, 10)
          .map((m) => toMatch(m, ctx)),
      }
    },
  }

  // ---------------------------------------------------------------- competitions
  /** After any result change: is it over, and who won? */
  function settleCompetition(comp: CompetitionRow, userId: number, actorName: string) {
    const own = repo.matches.listByCompetition(comp.id)
    let champion: number | null = null
    if (comp.format === 'league') {
      if (own.length && own.every((m) => m.status === 'played')) champion = standings(comp.playerIds, played(own), comp.points)[0].playerId
    } else {
      const final = own.find((m) => m.round === roundCount(comp.playerIds.length) && m.slot === 0)
      if (final?.status === 'played') champion = winnerOf(toPlayed(final))
    }
    if (champion === comp.championId) return
    repo.competitions.update(comp.id, { championId: champion, status: champion === null ? 'active' : 'finished', finishedAt: champion === null ? null : stamp() })
    if (champion !== null) log(comp.crewId, userId, actorName, `🏆 ${nameOf(repo.players.listByCrew(comp.crewId), champion)} won “${comp.name}”`)
  }

  /** Puts a knockout winner (or null) into the next round's slot. */
  function feedForward(comp: CompetitionRow, m: MatchRow, winner: number | null, own: MatchRow[]) {
    const total = roundCount(comp.playerIds.length)
    if (m.round >= total) return
    const next = nextSlot(m.round, m.slot)
    const target = own.find((x) => x.round === next.round && x.slot === next.slot)
    if (!target) return
    repo.matches.update(target.id, next.side === 'home' ? { homeId: winner } : { awayId: winner })
    // A bye-vs-bye can't happen with standard seeding, but a later slot can still become a walkover.
  }

  const competitions = {
    list(userId: number, crewId: number): CompetitionSummary[] {
      membership(userId, crewId)
      const matches = repo.matches.listByCrew(crewId)
      return repo.competitions.listByCrew(crewId).map((c) => compSummary(c, matches))
    },

    get(userId: number, competitionId: number): CompetitionDetail {
      const comp = repo.competitions.byId(competitionId)
      if (!comp) throw notFound('Competition')
      const { crew } = membership(userId, comp.crewId)
      const ctx = crewContext(comp.crewId)
      const own = ctx.matches.filter((m) => m.competitionId === comp.id)
      const ownPlayed = played(own)
      const total = roundCount(comp.playerIds.length)
      const roundNumbers = [...new Set(own.map((m) => m.round))].sort((a, b) => a - b)
      const rounds = roundNumbers.map((round) => ({
        round,
        name: comp.format === 'league' ? `Matchday ${round}` : roundName(round, total),
        matches: own.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot).map((m) => toMatch(m, ctx)),
      }))

      const awards: Award[] = []
      if (ownPlayed.length) {
        const stats = comp.playerIds.map((id) => playerStats(id, ownPlayed)).filter((s) => s.played > 0)
        const boot = [...stats].sort((a, b) => b.goalsFor - a.goalsFor || a.played - b.played)[0]
        if (boot?.goalsFor) awards.push({ title: 'Golden Boot', playerId: boot.playerId, detail: `${boot.goalsFor} ${boot.goalsFor === 1 ? 'goal' : 'goals'} in ${boot.played} ${boot.played === 1 ? 'game' : 'games'}` })
        const wall = [...stats].sort((a, b) => a.goalsAgainst / a.played - b.goalsAgainst / b.played || b.played - a.played)[0]
        if (wall) awards.push({ title: 'Best defence', playerId: wall.playerId, detail: `${wall.goalsAgainst} conceded in ${wall.played} · ${wall.cleanSheets} clean sheet${wall.cleanSheets === 1 ? '' : 's'}` })
        const big = records(comp.playerIds, ownPlayed).biggestWin
        if (big) awards.push({ title: 'Biggest win', playerId: big.winnerId, detail: `${big.for}–${big.against} vs ${nameOf(ctx.players, big.loserId)}` })
      }

      return {
        ...compSummary(comp, ctx.matches),
        crewId: comp.crewId,
        legs: comp.legs,
        points: comp.points,
        playerIds: comp.playerIds,
        table: comp.format === 'league' ? standings(comp.playerIds, ownPlayed, comp.points) : null,
        bracket: comp.format === 'knockout' ? rounds : null,
        rounds,
        awards,
        canDelete: comp.createdBy === userId || crew.ownerId === userId,
      }
    },

    create(userId: number, crewId: number, input: unknown): CompetitionDetail {
      const data = parse(competitionSchema, input)
      const { me } = membership(userId, crewId)
      assertPlayers(crewId, data.playerIds, 'playerIds')
      const ts = stamp()
      let order = data.playerIds
      if (data.format === 'knockout') {
        if (data.seeding === 'random') {
          order = [...order]
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1))
            ;[order[i], order[j]] = [order[j], order[i]]
          }
        } else if (data.seeding === 'rating') {
          const ctx = crewContext(crewId)
          order = [...order].sort((a, b) => ctx.ratings.current.get(b)! - ctx.ratings.current.get(a)! || data.playerIds.indexOf(a) - data.playerIds.indexOf(b))
        }
      }
      const id = repo.transaction(() => {
        const comp = repo.competitions.insert({
          crewId,
          name: data.name,
          format: data.format,
          legs: data.format === 'league' ? data.legs : 1,
          points: data.points,
          playerIds: order,
          status: 'active',
          championId: null,
          createdBy: userId,
          createdAt: ts,
          finishedAt: null,
        })
        const base = { crewId, competitionId: comp.id, homeClub: '', awayClub: '', homeGoals: null, awayGoals: null, homePens: null, awayPens: null, decidedBy: null, playedAt: null, notes: '', createdBy: userId, createdAt: ts, updatedAt: ts }
        if (data.format === 'league') {
          const slots = new Map<number, number>()
          for (const p of roundRobin(order, data.legs)) {
            const slot = slots.get(p.round) ?? 0
            slots.set(p.round, slot + 1)
            repo.matches.insert({ ...base, round: p.round, slot, homeId: p.homeId, awayId: p.awayId, status: 'scheduled' })
          }
        } else {
          const total = roundCount(order.length)
          const first = knockoutFirstRound(order)
          for (const s of first) repo.matches.insert({ ...base, round: 1, slot: s.slot, homeId: s.homeId, awayId: s.awayId, status: s.bye ? 'bye' : 'scheduled' })
          for (let r = 2; r <= total; r++) for (let s = 0; s < 2 ** (total - r); s++) repo.matches.insert({ ...base, round: r, slot: s, homeId: null, awayId: null, status: 'scheduled' })
          const own = repo.matches.listByCompetition(comp.id)
          for (const m of own.filter((x) => x.status === 'bye')) feedForward(comp, m, m.homeId ?? m.awayId, own)
        }
        log(crewId, userId, me.name, `started the ${data.format} “${comp.name}” with ${order.length} players`)
        return comp.id
      })
      return competitions.get(userId, id)
    },

    rename(userId: number, competitionId: number, input: unknown): CompetitionDetail {
      const { name } = parse(competitionPatchSchema, input)
      const comp = repo.competitions.byId(competitionId)
      if (!comp) throw notFound('Competition')
      membership(userId, comp.crewId)
      repo.competitions.update(competitionId, { name })
      return competitions.get(userId, competitionId)
    },

    remove(userId: number, competitionId: number): void {
      const comp = repo.competitions.byId(competitionId)
      if (!comp) throw notFound('Competition')
      const { crew, me } = membership(userId, comp.crewId)
      if (comp.createdBy !== userId && crew.ownerId !== userId) throw new AppError(403, 'forbidden', 'Only whoever created it, or the crew owner, can delete a competition')
      repo.transaction(() => {
        for (const m of repo.matches.listByCompetition(competitionId)) repo.matches.delete(m.id)
        repo.competitions.delete(competitionId)
        log(comp.crewId, userId, me.name, `deleted “${comp.name}” and its results`)
      })
    },
  }

  // ---------------------------------------------------------------- matches
  const applyResult = (match: MatchRow, data: ReturnType<typeof resultSchema.parse>) => ({
    homeGoals: data.homeGoals,
    awayGoals: data.awayGoals,
    homePens: data.homePens,
    awayPens: data.awayPens,
    homeClub: data.homeClub,
    awayClub: data.awayClub,
    decidedBy: data.decidedBy,
    notes: data.notes,
    playedAt: data.playedAt ? new Date(data.playedAt).toISOString() : (match.playedAt ?? stamp()),
    status: 'played' as const,
    updatedAt: stamp(),
  })

  const matches = {
    record(userId: number, matchId: number, input: unknown): Match {
      const data = parse(resultSchema, input)
      const { match, me } = ownMatch(userId, matchId)
      if (match.status === 'bye') throw new AppError(400, 'bye', 'This is a bye — nobody plays it')
      if (match.homeId === null || match.awayId === null) throw new AppError(409, 'not_ready', "Both players aren't known yet — finish the earlier round first")
      const comp = match.competitionId ? repo.competitions.byId(match.competitionId)! : null
      const players = repo.players.listByCrew(match.crewId)
      repo.transaction(() => {
        if (comp?.format === 'knockout') {
          const winner = winnerOf({ homeId: match.homeId!, awayId: match.awayId!, homeGoals: data.homeGoals, awayGoals: data.awayGoals, homePens: data.homePens, awayPens: data.awayPens })
          if (winner === null) {
            throw new AppError(400, 'validation', 'Knockout matches need a winner — add the penalty shoot-out', { decidedBy: 'Knockout matches need a winner — add the penalty shoot-out' })
          }
          const before = match.status === 'played' ? winnerOf(toPlayed(match)) : null
          const own = repo.matches.listByCompetition(comp.id)
          if (before !== null && before !== winner) {
            const next = nextSlot(match.round, match.slot)
            const target = own.find((x) => x.round === next.round && x.slot === next.slot)
            if (target?.status === 'played') {
              throw new AppError(409, 'next_played', `That changes who went through, but the next round is already played. Clear the ${roundName(next.round, roundCount(comp.playerIds.length))} result first.`)
            }
          }
          repo.matches.update(matchId, applyResult(match, data))
          feedForward(comp, match, winner, own)
        } else {
          repo.matches.update(matchId, applyResult(match, data))
        }
        const verb = match.status === 'played' ? 'corrected' : 'recorded'
        log(match.crewId, userId, me.name, `${verb} ${nameOf(players, match.homeId)} ${score(data)} ${nameOf(players, match.awayId)}${comp ? ` · ${comp.name}` : ' · friendly'}`)
        if (comp) settleCompetition(repo.competitions.byId(comp.id)!, userId, me.name)
      })
      return toMatch(repo.matches.byId(matchId)!, crewContext(match.crewId))
    },

    /** Undo a result. Friendlies are deleted; competition matches go back to "to play". */
    clear(userId: number, matchId: number): void {
      const { match, me } = ownMatch(userId, matchId)
      if (match.status !== 'played') throw new AppError(409, 'not_played', 'This match has no result to clear')
      const comp = match.competitionId ? repo.competitions.byId(match.competitionId)! : null
      const players = repo.players.listByCrew(match.crewId)
      repo.transaction(() => {
        if (!comp) {
          repo.matches.delete(matchId)
        } else {
          if (comp.format === 'knockout') {
            const own = repo.matches.listByCompetition(comp.id)
            const next = nextSlot(match.round, match.slot)
            const target = own.find((x) => x.round === next.round && x.slot === next.slot)
            if (target?.status === 'played') throw new AppError(409, 'next_played', `The next round is already played. Clear the ${roundName(next.round, roundCount(comp.playerIds.length))} result first.`)
            feedForward(comp, match, null, own)
          }
          repo.matches.update(matchId, { homeGoals: null, awayGoals: null, homePens: null, awayPens: null, decidedBy: null, playedAt: null, status: 'scheduled', updatedAt: stamp() })
        }
        log(match.crewId, userId, me.name, `cleared ${nameOf(players, match.homeId)} ${score(match)} ${nameOf(players, match.awayId)}${comp ? ` · ${comp.name}` : ' · friendly'}`)
        if (comp) settleCompetition(repo.competitions.byId(comp.id)!, userId, me.name)
      })
    },

    friendly(userId: number, crewId: number, input: unknown): Match {
      const data = parse(friendlySchema, input)
      const { me } = membership(userId, crewId)
      assertPlayers(crewId, [data.homeId, data.awayId], 'awayId')
      const players = repo.players.listByCrew(crewId)
      const ts = stamp()
      const row = repo.transaction(() => {
        const base: MatchRow = { id: 0, crewId, competitionId: null, round: 0, slot: 0, homeId: data.homeId, awayId: data.awayId, homeClub: '', awayClub: '', homeGoals: null, awayGoals: null, homePens: null, awayPens: null, decidedBy: null, status: 'scheduled', playedAt: null, notes: '', createdBy: userId, createdAt: ts, updatedAt: ts }
        const { id: _drop, ...fields } = { ...base, ...applyResult(base, data) }
        void _drop
        const r = repo.matches.insert(fields)
        log(crewId, userId, me.name, `recorded ${nameOf(players, data.homeId)} ${score(data)} ${nameOf(players, data.awayId)} · friendly`)
        return r
      })
      return toMatch(row, crewContext(crewId))
    },

    list(userId: number, crewId: number): Match[] {
      membership(userId, crewId)
      const ctx = crewContext(crewId)
      return chronological(ctx.matches.filter((m) => m.status === 'played') as (MatchRow & { playedAt: string })[])
        .reverse()
        .map((m) => toMatch(m, ctx))
    },
  }

  // ---------------------------------------------------------------- overview & sample
  function activity(userId: number, crewId?: number, limit = 20): Activity[] {
    const mine = repo.players.listByUser(userId).map((p) => p.crewId)
    const ids = crewId ? (membership(userId, crewId), [crewId]) : mine
    return repo.activity.listByCrews(ids, Math.min(Math.max(limit, 1), 100)).map((a) => ({
      id: a.id,
      crewId: a.crewId,
      crewName: repo.crews.byId(a.crewId)?.name ?? '',
      actorName: a.actorName,
      isYou: a.userId === userId,
      text: a.text,
      createdAt: a.createdAt,
    }))
  }

  const overview = (userId: number): Overview => ({ crews: crews.list(userId), activity: activity(userId, undefined, 12) })

  /**
   * A believable crew: a finished league, a cup halfway through and a new
   * season under way — generated from fixed player strengths with a seeded
   * random number generator, so every demo tells the same story.
   */
  function seedSample(userId: number): CrewSummary[] {
    const rng = mulberry32(2026)
    const poisson = (lambda: number) => {
      const l = Math.exp(-lambda)
      let k = 0
      let p = 1
      do {
        k++
        p *= rng()
      } while (p > l)
      return k - 1
    }
    const start = now().getTime()
    // 20:30 IST evenings, `daysAgo` days back
    const at = (daysAgo: number, minute = 0) => new Date(Math.floor((start - daysAgo * 86_400_000) / 86_400_000) * 86_400_000 + (15 * 60 + minute) * 60_000).toISOString()
    return repo.transaction(() => {
      const crew = crews.create(userId, { name: 'Hostel Room 12', playerNames: ['Rohan', 'Aisha', 'Kabir', 'Meera', 'Arjun'] })
      const ids = crew.players.map((p) => p.id)
      const [you, rohan, aisha, kabir, meera, arjun] = ids
      const strength = new Map([
        [you, 1.15],
        [rohan, 1.3],
        [aisha, 1.2],
        [kabir, 0.95],
        [meera, 1.0],
        [arjun, 0.8],
      ])
      const fav = new Map([
        [you, ['Real Madrid', 'Barcelona']],
        [rohan, ['Manchester City', 'Liverpool']],
        [aisha, ['Arsenal', 'Bayern Munich']],
        [kabir, ['Paris Saint-Germain', 'Inter']],
        [meera, ['Liverpool', 'Juventus']],
        [arjun, ['Borussia Dortmund', 'AC Milan']],
      ])
      const play = (matchId: number | null, home: number, away: number, when: string, knockout = false): ResultInput & { homeId: number; awayId: number } => {
        const hs = strength.get(home)!
        const as = strength.get(away)!
        const base = knockout ? 1.6 : 1.45
        let homeGoals = poisson(base * (hs / as))
        let awayGoals = poisson(base * (as / hs))
        let decidedBy: ResultInput['decidedBy'] = 'normal'
        let homePens: number | null = null
        let awayPens: number | null = null
        if (knockout && homeGoals === awayGoals) {
          if (rng() < 0.55) {
            // Settled in extra time, usually by the stronger player.
            if (rng() < hs / (hs + as)) homeGoals++
            else awayGoals++
            decidedBy = 'extra_time'
          } else {
            decidedBy = 'penalties'
            homePens = 3 + Math.floor(rng() * 3)
            awayPens = rng() < 0.5 ? homePens - 1 : homePens + 1
          }
        }
        const result: ResultInput & { homeId: number; awayId: number } = {
          homeId: home,
          awayId: away,
          homeGoals,
          awayGoals,
          homeClub: fav.get(home)![Math.floor(rng() * 2)],
          awayClub: fav.get(away)![Math.floor(rng() * 2)],
          decidedBy,
          homePens,
          awayPens,
          playedAt: when,
        }
        if (matchId) matches.record(userId, matchId, result)
        return result
      }

      // Season 1: a finished league.
      const s1 = competitions.create(userId, crew.id, { name: 'Season 1', format: 'league', playerIds: ids, legs: 1 })
      s1.rounds.forEach((r, i) => r.matches.forEach((m, j) => play(m.id, m.homeId!, m.awayId!, at(60 - i * 5, j * 25))))

      // A few friendlies between seasons.
      const f = (h: number, a: number, daysAgo: number) => matches.friendly(userId, crew.id, play(null, h, a, at(daysAgo)))
      f(you, rohan, 31)
      f(aisha, kabir, 30)
      f(you, arjun, 26)

      // Diwali Cup: seeded by rating, top two get byes; one semi left to play, then the final.
      const cup = competitions.create(userId, crew.id, { name: 'Diwali Cup', format: 'knockout', playerIds: ids, seeding: 'rating' })
      const firstRound = cup.rounds[0].matches.filter((m) => m.status === 'scheduled')
      firstRound.forEach((m, i) => play(m.id, m.homeId!, m.awayId!, at(20 - i, 10), true))
      const semis = competitions.get(userId, cup.id).rounds[1].matches
      play(semis[0].id, semis[0].homeId!, semis[0].awayId!, at(12), true)

      // Season 2: double round-robin under way.
      const s2 = competitions.create(userId, crew.id, { name: 'Season 2', format: 'league', playerIds: ids, legs: 2, points: { win: 3, draw: 1, loss: 0 } })
      s2.rounds.slice(0, 2).forEach((r, i) => r.matches.forEach((m, j) => play(m.id, m.homeId!, m.awayId!, at(8 - i * 3, j * 25))))
      f(meera, you, 1)

      return crews.list(userId)
    })
  }

  return { auth, crews, players, competitions, matches, activity, overview, seedSample }
}

export type Services = ReturnType<typeof createServices>
