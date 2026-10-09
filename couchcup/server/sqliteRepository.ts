import { DatabaseSync } from 'node:sqlite'
import type { ActivityRow, CompetitionRow, CrewRow, MatchRow, PlayerRow, Repository, UserRow } from '../shared/repository.ts'

const SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS crews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    owner_id INTEGER NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    color INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    legs INTEGER NOT NULL,
    points TEXT NOT NULL,
    player_ids TEXT NOT NULL,
    status TEXT NOT NULL,
    champion_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    home_id INTEGER REFERENCES players(id),
    away_id INTEGER REFERENCES players(id),
    home_club TEXT NOT NULL DEFAULT '',
    away_club TEXT NOT NULL DEFAULT '',
    home_goals INTEGER CHECK (home_goals IS NULL OR home_goals >= 0),
    away_goals INTEGER CHECK (away_goals IS NULL OR away_goals >= 0),
    home_pens INTEGER,
    away_pens INTEGER,
    decided_by TEXT,
    status TEXT NOT NULL,
    played_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crew_id INTEGER NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    actor_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_players_crew ON players(crew_id);
  CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
  CREATE INDEX IF NOT EXISTS idx_comp_crew ON competitions(crew_id);
  CREATE INDEX IF NOT EXISTS idx_matches_crew ON matches(crew_id);
  CREATE INDEX IF NOT EXISTS idx_matches_comp ON matches(competition_id);
  CREATE INDEX IF NOT EXISTS idx_activity_crew ON activity(crew_id, id);
`

type Row = Record<string, unknown>
type Value = string | number | null
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const JSON_COLUMNS = new Set(['points', 'player_ids'])

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
    const col = snake(k)
    cols.push(col)
    vals.push(JSON_COLUMNS.has(col) ? JSON.stringify(v) : (v as Value))
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
    crews: { ...table<CrewRow>('crews'), byInviteCode: (c) => get<CrewRow>('SELECT * FROM crews WHERE invite_code = ?', c) },
    players: {
      ...table<PlayerRow>('players'),
      listByCrew: (c) => all<PlayerRow>('SELECT * FROM players WHERE crew_id = ? ORDER BY id', c),
      listByUser: (u) => all<PlayerRow>('SELECT * FROM players WHERE user_id = ? ORDER BY id', u),
    },
    competitions: { ...table<CompetitionRow>('competitions'), listByCrew: (c) => all<CompetitionRow>('SELECT * FROM competitions WHERE crew_id = ? ORDER BY id', c) },
    matches: {
      ...table<MatchRow>('matches'),
      listByCrew: (c) => all<MatchRow>('SELECT * FROM matches WHERE crew_id = ? ORDER BY id', c),
      listByCompetition: (c) => all<MatchRow>('SELECT * FROM matches WHERE competition_id = ? ORDER BY id', c),
    },
    activity: {
      ...table<ActivityRow>('activity'),
      listByCrews(ids, limit) {
        if (!ids.length) return []
        return all<ActivityRow>(`SELECT * FROM activity WHERE crew_id IN (${ids.map(() => '?').join(',')}) ORDER BY id DESC LIMIT ?`, ...ids, Math.min(limit, 1_000_000))
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
