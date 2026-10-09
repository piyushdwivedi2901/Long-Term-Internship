import type { ActivityRow, ExpenseRow, GroupRow, MemberRow, Repository, SettlementRow, Table, UserRow } from './repository.ts'

export interface Snapshot {
  version: 1
  seq: number
  users: UserRow[]
  groups: GroupRow[]
  members: MemberRow[]
  expenses: ExpenseRow[]
  settlements: SettlementRow[]
  activity: ActivityRow[]
}

export const emptySnapshot = (): Snapshot => ({
  version: 1,
  seq: 0,
  users: [],
  groups: [],
  members: [],
  expenses: [],
  settlements: [],
  activity: [],
})

const clone = <T>(v: T): T => structuredClone(v)
type TableName = Exclude<keyof Snapshot, 'version' | 'seq'>

/**
 * In-memory Repository with atomic transactions. `onChange` receives a
 * snapshot after each committed write (the browser demo persists it to
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
  const groups = table<GroupRow>('groups')
  const members = table<MemberRow>('members')
  const expenses = table<ExpenseRow>('expenses')
  const settlements = table<SettlementRow>('settlements')
  const activity = table<ActivityRow>('activity')
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id

  return {
    users: { ...users, byEmail: (email) => users.where((u) => u.email === email)[0] },
    groups: { ...groups, byInviteCode: (code) => groups.where((g) => g.inviteCode === code)[0] },
    members: {
      ...members,
      listByGroup: (gid) => members.where((m) => m.groupId === gid).sort(byId),
      listByUser: (uid) => members.where((m) => m.userId === uid).sort(byId),
    },
    expenses: { ...expenses, listByGroup: (gid) => expenses.where((e) => e.groupId === gid).sort(byId) },
    settlements: { ...settlements, listByGroup: (gid) => settlements.where((s) => s.groupId === gid).sort(byId) },
    activity: {
      ...activity,
      listByGroups: (gids, limit) => {
        const set = new Set(gids)
        return activity.where((a) => set.has(a.groupId)).sort((a, b) => b.id - a.id).slice(0, limit)
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
