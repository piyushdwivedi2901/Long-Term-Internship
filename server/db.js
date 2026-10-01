import { DatabaseSync } from 'node:sqlite'

/**
 * Opens (and migrates) the SQLite database. `node:sqlite` ships with Node 22,
 * so there is no native module to compile.
 * Pass ':memory:' in tests for an isolated, throw-away database.
 */
export function openDb(file = process.env.DB_FILE ?? 'server/data.sqlite') {
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)
  // Migration (Task 36): todos gain an optional owner. NULL = the anonymous
  // list used by Task 35; a user id = that user's private list.
  const columns = db.prepare('PRAGMA table_info(todos)').all()
  if (!columns.some((c) => c.name === 'user_id')) {
    db.exec('ALTER TABLE todos ADD COLUMN user_id INTEGER REFERENCES users(id)')
  }
  return db
}
