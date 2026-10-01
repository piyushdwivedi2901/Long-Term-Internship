import { DatabaseSync } from 'node:sqlite'

/**
 * Opens (and migrates) the SQLite database. `node:sqlite` ships with Node 22,
 * so there is no native module to compile.
 * Pass ':memory:' in tests for an isolated, throw-away database.
 */
export function openDb(file = process.env.DB_FILE ?? 'server/data.sqlite') {
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      text       TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `)
  return db
}
