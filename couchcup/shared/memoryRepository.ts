import type { ActivityRow, CompetitionRow, CrewRow, MatchRow, PlayerRow, Repository, Table, UserRow } from './repository.ts'

export interface Snapshot {
  version: 1
  seq: number
  users: UserRow[]
  crews: CrewRow[]
  players: PlayerRow[]
  competitions: CompetitionRow[]
  matches: MatchRow[]
  activity: ActivityRow[]
}

export const emptySnapshot = (): Snapshot => ({ version: 1, seq: 0, users: [], crews: [], players: [], competitions: [], matches: [], activity: [] })

const clone = <T>(v: T): T => structuredClone(v)
type TableName = Exclude<keyof Snapshot, 'version' | 'seq'>

/**
 * In-memory Repository with atomic transactions. `onChange` receives the new
 * state after each committed write (the browser demo persists it to
 * localStorage). Rows are cloned in and out, like a real database.
 */
export function createMemoryRepository(initial: Snapshot = emptySnapshot(), onChange?: (s: Snapshot) => void): Repository & { snapshot(): Snapshot } {
  let db = clone(initial)
  let depth = 0
  let dirty = false
  const changed = () => (depth > 0 ? (dirty = true) : onChange?.(clone(db)))

  function table<Row extends { id: number }>(name: TableName) {
    const rows = () => db[name] as unknown as Row[]
    const t: Table<Row> & { where(p: (r: Row) => boolean): Row[] } = {
      insert(row) {
        const full = { ...clone(row), id: ++db.seq } as Row
        rows().push(full)
        changed()
        return clone(full)
      },
      byId(id) {
        const r = rows().find((x) => x.id === id)
        return r && clone(r)
      },
      update(id, patch) {
        const r = rows().find((x) => x.id === id)
        if (!r) return
        Object.assign(r, clone(patch))
        changed()
      },
      delete(id) {
        ;(db[name] as unknown as Row[]) = rows().filter((x) => x.id !== id)
        changed()
      },
      where: (p) => rows().filter(p).map(clone),
    }
    return t
  }

  const users = table<UserRow>('users')
  const crews = table<CrewRow>('crews')
  const players = table<PlayerRow>('players')
  const competitions = table<CompetitionRow>('competitions')
  const matches = table<MatchRow>('matches')
  const activity = table<ActivityRow>('activity')
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id

  return {
    users: { ...users, byEmail: (email) => users.where((u) => u.email === email)[0] },
    crews: { ...crews, byInviteCode: (code) => crews.where((c) => c.inviteCode === code)[0] },
    players: {
      ...players,
      listByCrew: (cid) => players.where((p) => p.crewId === cid).sort(byId),
      listByUser: (uid) => players.where((p) => p.userId === uid).sort(byId),
    },
    competitions: { ...competitions, listByCrew: (cid) => competitions.where((c) => c.crewId === cid).sort(byId) },
    matches: {
      ...matches,
      listByCrew: (cid) => matches.where((m) => m.crewId === cid).sort(byId),
      listByCompetition: (id) => matches.where((m) => m.competitionId === id).sort(byId),
    },
    activity: {
      ...activity,
      listByCrews: (ids, limit) => {
        const set = new Set(ids)
        return activity.where((a) => set.has(a.crewId)).sort((a, b) => b.id - a.id).slice(0, limit)
      },
    },
    transaction<T>(fn: () => T): T {
      const before = clone(db)
      depth++
      try {
        const result = fn()
        depth--
        if (depth === 0 && dirty) {
          dirty = false
          onChange?.(clone(db))
        }
        return result
      } catch (err) {
        depth--
        db = before
        if (depth === 0) dirty = false
        throw err
      }
    },
    snapshot: () => clone(db),
  }
}
