import { DatabaseSync } from 'node:sqlite'
import type { ActivityRow, CommentRow, ProjectRow, Repository, TaskRow, UserRow } from '../shared/repository.ts'

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL,
    priority     TEXT NOT NULL,
    due_date     TEXT,
    labels       TEXT NOT NULL DEFAULT '[]',
    checklist    TEXT NOT NULL DEFAULT '[]',
    position     INTEGER NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL,
    project_id INTEGER,
    task_id    INTEGER,
    summary    TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(project_id, status, position);
  CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
  CREATE INDEX IF NOT EXISTS idx_activity_owner ON activity(owner_id, id);
`

type Row = Record<string, unknown>

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const JSON_COLUMNS = new Set(['labels', 'checklist'])

function fromDb<T>(row: Row | undefined): T | undefined {
  if (!row) return undefined
  const out: Row = {}
  for (const [k, v] of Object.entries(row)) out[camel(k)] = JSON_COLUMNS.has(k) ? JSON.parse(String(v)) : v
  return out as T
}

function toDb(obj: Row): [string[], (string | number | null)[]] {
  const cols: string[] = []
  const vals: (string | number | null)[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue
    cols.push(snake(k))
    vals.push(JSON_COLUMNS.has(k) ? JSON.stringify(v) : (v as string | number | null))
  }
  return [cols, vals]
}

/** SQLite implementation of the Repository (Node's built-in node:sqlite). */
export function createSqliteRepository(file = ':memory:'): Repository & { close(): void } {
  const db = new DatabaseSync(file)
  db.exec(SCHEMA)
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;')

  // Column names come from code (never from requests); values are always bound parameters.
  const all = <T>(sql: string, ...args: (string | number | null)[]) =>
    (db.prepare(sql).all(...args) as Row[]).map((r) => fromDb<T>(r)!)
  const get = <T>(sql: string, ...args: (string | number | null)[]) => fromDb<T>(db.prepare(sql).get(...args) as Row | undefined)

  function table<T extends { id: number }>(name: string) {
    return {
      insert(row: Omit<T, 'id'>): T {
        const [cols, vals] = toDb(row as Row)
        const { lastInsertRowid } = db
          .prepare(`INSERT INTO ${name} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
          .run(...vals)
        return get<T>(`SELECT * FROM ${name} WHERE id = ?`, Number(lastInsertRowid))!
      },
      byId: (id: number) => get<T>(`SELECT * FROM ${name} WHERE id = ?`, id),
      update(id: number, patch: Partial<Omit<T, 'id'>>) {
        const [cols, vals] = toDb(patch as Row)
        if (!cols.length) return
        db.prepare(`UPDATE ${name} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...vals, id)
      },
      delete(id: number) {
        db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(id)
      },
    }
  }

  const users = table<UserRow>('users')
  const projects = table<ProjectRow>('projects')
  const tasks = table<TaskRow>('tasks')
  const comments = table<CommentRow>('comments')
  const activity = table<ActivityRow>('activity')

  let depth = 0
  return {
    users: { ...users, byEmail: (email) => get<UserRow>('SELECT * FROM users WHERE email = ?', email) },
    projects: { ...projects, listByOwner: (id) => all<ProjectRow>('SELECT * FROM projects WHERE owner_id = ? ORDER BY id', id) },
    tasks: { ...tasks, listByOwner: (id) => all<TaskRow>('SELECT * FROM tasks WHERE owner_id = ?', id) },
    comments: {
      ...comments,
      listByTask: (id) => all<CommentRow>('SELECT * FROM comments WHERE task_id = ? ORDER BY id', id),
      countByTasks(ids) {
        const counts = new Map<number, number>()
        if (!ids.length) return counts
        const rows = db
          .prepare(`SELECT task_id, COUNT(*) AS n FROM comments WHERE task_id IN (${ids.map(() => '?').join(',')}) GROUP BY task_id`)
          .all(...ids) as { task_id: number; n: number }[]
        for (const r of rows) counts.set(r.task_id, Number(r.n))
        return counts
      },
    },
    activity: {
      insert: activity.insert,
      listByOwner: (id, limit) => all<ActivityRow>('SELECT * FROM activity WHERE owner_id = ? ORDER BY id DESC LIMIT ?', id, limit),
      deleteByOwner: (id) => void db.prepare('DELETE FROM activity WHERE owner_id = ?').run(id),
    },
    transaction<T>(fn: () => T): T {
      // Savepoints make nested calls (e.g. seedSample → projects.create) safe.
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
