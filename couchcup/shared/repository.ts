import type { DecidedBy, Format } from './schemas.ts'

/**
 * Storage interface: SQLite on the server (server/sqliteRepository.ts),
 * in-memory + localStorage for the static demo (shared/memoryRepository.ts).
 * All rules live in services.ts.
 */
export interface UserRow { id: number; name: string; email: string; passwordHash: string; createdAt: string }
export interface CrewRow { id: number; name: string; ownerId: number; inviteCode: string; createdAt: string; updatedAt: string }
export interface PlayerRow { id: number; crewId: number; userId: number | null; name: string; color: number; createdAt: string }
export interface CompetitionRow {
  id: number
  crewId: number
  name: string
  format: Format
  legs: 1 | 2
  points: { win: number; draw: number; loss: number }
  /** seeded order for knockouts; listed order for leagues */
  playerIds: number[]
  status: 'active' | 'finished'
  championId: number | null
  createdBy: number
  createdAt: string
  finishedAt: string | null
}
export interface MatchRow {
  id: number
  crewId: number
  /** null for a friendly */
  competitionId: number | null
  round: number
  slot: number
  /** null while a knockout slot is still to be decided */
  homeId: number | null
  awayId: number | null
  homeClub: string
  awayClub: string
  homeGoals: number | null
  awayGoals: number | null
  homePens: number | null
  awayPens: number | null
  decidedBy: DecidedBy | null
  status: 'scheduled' | 'played' | 'bye'
  playedAt: string | null
  notes: string
  createdBy: number
  createdAt: string
  updatedAt: string
}
export interface ActivityRow { id: number; crewId: number; userId: number; actorName: string; text: string; createdAt: string }

type New<T> = Omit<T, 'id'>

export interface Table<Row extends { id: number }> {
  insert(row: New<Row>): Row
  byId(id: number): Row | undefined
  update(id: number, patch: Partial<New<Row>>): void
  delete(id: number): void
}

export interface Repository {
  users: Table<UserRow> & { byEmail(email: string): UserRow | undefined }
  crews: Table<CrewRow> & { byInviteCode(code: string): CrewRow | undefined }
  players: Table<PlayerRow> & { listByCrew(crewId: number): PlayerRow[]; listByUser(userId: number): PlayerRow[] }
  competitions: Table<CompetitionRow> & { listByCrew(crewId: number): CompetitionRow[] }
  matches: Table<MatchRow> & { listByCrew(crewId: number): MatchRow[]; listByCompetition(competitionId: number): MatchRow[] }
  activity: Table<ActivityRow> & { listByCrews(crewIds: number[], limit: number): ActivityRow[] }
  transaction<T>(fn: () => T): T
}
