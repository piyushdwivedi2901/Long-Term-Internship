import type { ClaimRow, FileRow, ItemRow, Repository, Table, UserRow } from './repository.ts'

export interface Snapshot {
  version: 1
  seq: number
  users: UserRow[]
  items: ItemRow[]
  claims: ClaimRow[]
  files: FileRow[]
}

export const emptySnapshot = (): Snapshot => ({ version: 1, seq: 0, users: [], items: [], claims: [], files: [] })

const clone = <T>(v: T): T => structuredClone(v)
type TableName = Exclude<keyof Snapshot, 'version' | 'seq'>

/**
 * In-memory Repository with atomic transactions. `onChange` receives the
 * new state after each committed write (the browser demo persists it to
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
  const items = table<ItemRow>('items')
  const claims = table<ClaimRow>('claims')
  const files = table<FileRow>('files')
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id

  return {
    users: { ...users, byEmail: (email) => users.where((u) => u.email === email)[0] },
    items: { ...items, listByUser: (uid) => items.where((i) => i.userId === uid).sort(byId) },
    claims: {
      ...claims,
      listByItem: (iid) => claims.where((c) => c.itemId === iid).sort(byId),
      listByUser: (uid) => claims.where((c) => c.userId === uid).sort(byId),
    },
    files: {
      insert: files.insert,
      byId: files.byId,
      delete: files.delete,
      // Metadata only — never copy the file contents just to list them.
      listMetaByItem: (iid) =>
        (db.files as FileRow[])
          .filter((f) => f.itemId === iid)
          .map(({ data: _data, ...meta }) => (void _data, clone(meta)))
          .sort(byId),
      countByUser(uid) {
        const mine = (db.files as FileRow[]).filter((f) => f.userId === uid)
        return { count: mine.length, bytes: mine.reduce((n, f) => n + f.size, 0) }
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
