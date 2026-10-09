import { DatabaseSync } from 'node:sqlite'
import type { ClaimRow, FileMetaRow, FileRow, ItemRow, Repository, UserRow } from '../shared/repository.ts'

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    remind_days INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    price INTEGER CHECK (price IS NULL OR price >= 0),
    store TEXT NOT NULL DEFAULT '',
    invoice_no TEXT NOT NULL DEFAULT '',
    serial_no TEXT NOT NULL DEFAULT '',
    room TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    support TEXT NOT NULL,
    coverages TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    issue TEXT NOT NULL,
    status TEXT NOT NULL,
    under_warranty INTEGER NOT NULL,
    cost INTEGER NOT NULL CHECK (cost >= 0),
    ticket_no TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
  CREATE INDEX IF NOT EXISTS idx_claims_item ON claims(item_id);
  CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);
  CREATE INDEX IF NOT EXISTS idx_files_item ON files(item_id);
  CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
`

type Row = Record<string, unknown>
type Value = string | number | null | Uint8Array
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const JSON_COLUMNS = new Set(['support', 'coverages'])
const BOOL_COLUMNS = new Set(['under_warranty'])

const fromDb = <T>(row: Row | undefined): T | undefined => {
  if (!row) return undefined
  const out: Row = {}
  for (const [k, v] of Object.entries(row)) {
    if (JSON_COLUMNS.has(k)) out[camel(k)] = JSON.parse(String(v))
    else if (BOOL_COLUMNS.has(k)) out[camel(k)] = v === 1
    // File contents are stored as real bytes (BLOB) and handed back as base64.
    else if (k === 'data' && v instanceof Uint8Array) out.data = Buffer.from(v).toString('base64')
    else out[camel(k)] = v
  }
  return out as T
}
const toDb = (obj: Row): [string[], Value[]] => {
  const cols: string[] = []
  const vals: Value[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    const col = snake(k)
    cols.push(col)
    if (JSON_COLUMNS.has(col)) vals.push(JSON.stringify(v))
    else if (BOOL_COLUMNS.has(col)) vals.push(v ? 1 : 0)
    else if (col === 'data') vals.push(new Uint8Array(Buffer.from(String(v), 'base64')))
    else vals.push(v as Value)
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

  const files = table<FileRow>('files')
  let depth = 0
  return {
    users: { ...table<UserRow>('users'), byEmail: (e) => get<UserRow>('SELECT * FROM users WHERE email = ?', e) },
    items: { ...table<ItemRow>('items'), listByUser: (u) => all<ItemRow>('SELECT * FROM items WHERE user_id = ? ORDER BY id', u) },
    claims: {
      ...table<ClaimRow>('claims'),
      listByItem: (i) => all<ClaimRow>('SELECT * FROM claims WHERE item_id = ? ORDER BY id', i),
      listByUser: (u) => all<ClaimRow>('SELECT * FROM claims WHERE user_id = ? ORDER BY id', u),
    },
    files: {
      insert: files.insert,
      byId: files.byId,
      delete: files.delete,
      listMetaByItem: (i) => all<FileMetaRow>('SELECT id, item_id, user_id, name, mime, size, created_at FROM files WHERE item_id = ? ORDER BY id', i),
      countByUser(u) {
        const r = db.prepare('SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes FROM files WHERE user_id = ?').get(u) as { count: number; bytes: number }
        return { count: Number(r.count), bytes: Number(r.bytes) }
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
