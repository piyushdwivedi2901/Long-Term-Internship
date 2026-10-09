import { DatabaseSync } from 'node:sqlite'
import type { ActivityRow, ExpenseRow, GroupRow, MemberRow, Repository, SettlementRow, UserRow } from '../shared/repository.ts'

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    currency TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    paid_by INTEGER NOT NULL REFERENCES members(id),
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    split TEXT NOT NULL,
    shares TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_member INTEGER NOT NULL REFERENCES members(id),
    to_member INTEGER NOT NULL REFERENCES members(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    actor_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_members_group ON members(group_id);
  CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
  CREATE INDEX IF NOT EXISTS idx_settlements_group ON settlements(group_id);
  CREATE INDEX IF NOT EXISTS idx_activity_group ON activity(group_id, id);
`

type Row = Record<string, unknown>
type Value = string | number | null
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const JSON_COLUMNS = new Set(['split', 'shares'])

const fromDb = <T>(row: Row | undefined): T | undefined => {
  if (!row) return undefined
  const out: Row = {}
  for (const [k, v] of Object.entries(row)) out[camel(k)] = JSON_COLUMNS.has(k) ? JSON.parse(String(v)) : v
  return out as T
}
const toDb = (obj: Row): [string[], Value[]] => {
  const cols: string[] = []
  const vals: Value[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    cols.push(snake(k))
    vals.push(JSON_COLUMNS.has(k) ? JSON.stringify(v) : (v as Value))
  }
  return [cols, vals]
}

/** SQLite Repository using Node's built-in node:sqlite. Values are always bound parameters. */
export function createSqliteRepository(file = ':memory:'): Repository & { close(): void } {
  const db = new DatabaseSync(file)
  db.exec(SCHEMA)
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')

  const all = <T>(sql: string, ...args: Value[]) => (db.prepare(sql).all(...args) as Row[]).map((r) => fromDb<T>(r)!)
  const get = <T>(sql: string, ...args: Value[]) => fromDb<T>(db.prepare(sql).get(...args) as Row | undefined)

  function table<T extends { id: number }>(name: string) {
    return {
      insert(row: Omit<T, 'id'>): T {
        const [cols, vals] = toDb(row as Row)
        const { lastInsertRowid } = db.prepare(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...vals)
        return get<T>(`SELECT * FROM ${name} WHERE id = ?`, Number(lastInsertRowid))!
      },
      byId: (id: number) => get<T>(`SELECT * FROM ${name} WHERE id = ?`, id),
      update(id: number, patch: Partial<Omit<T, 'id'>>) {
        const [cols, vals] = toDb(patch as Row)
        if (cols.length) db.prepare(`UPDATE ${name} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...vals, id)
      },
      delete(id: number) {
        db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id)
      },
    }
  }

  let depth = 0
  return {
    users: { ...table<UserRow>('users'), byEmail: (e) => get<UserRow>('SELECT * FROM users WHERE email = ?', e) },
    groups: { ...table<GroupRow>('groups'), byInviteCode: (c) => get<GroupRow>('SELECT * FROM groups WHERE invite_code = ?', c) },
    members: {
      ...table<MemberRow>('members'),
      listByGroup: (g) => all<MemberRow>('SELECT * FROM members WHERE group_id = ? ORDER BY id', g),
      listByUser: (u) => all<MemberRow>('SELECT * FROM members WHERE user_id = ? ORDER BY id', u),
    },
    expenses: { ...table<ExpenseRow>('expenses'), listByGroup: (g) => all<ExpenseRow>('SELECT * FROM expenses WHERE group_id = ? ORDER BY id', g) },
    settlements: { ...table<SettlementRow>('settlements'), listByGroup: (g) => all<SettlementRow>('SELECT * FROM settlements WHERE group_id = ? ORDER BY id', g) },
    activity: {
      ...table<ActivityRow>('activity'),
      listByGroups(ids, limit) {
        if (!ids.length) return []
        return all<ActivityRow>(`SELECT * FROM activity WHERE group_id IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC LIMIT ?`, ...ids, Math.min(limit, 1_000_000))
      },
    },
    transaction<T>(fn: () => T): T {
      const sp = `sp${depth++}`
      db.exec(`SAVEPOINT ${sp}`)
      try {
        const result = fn()
        db.exec(`RELEASE ${sp}`)
        return result
      } catch (err) {
        db.exec(`ROLLBACK TO ${sp}; RELEASE ${sp}`)
        throw err
      } finally {
        depth--
      }
    },
    close: () => db.close(),
  }
}
