import type { ClubUse, HeadToHead, Outcome, RatingPoint, Records, TableRow } from './engine.ts'
import type { DecidedBy, Format } from './schemas.ts'

export type { ClubUse, HeadToHead, Outcome, RatingPoint, Records, TableRow, DecidedBy, Format }

export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

export interface Session {
  token: string
  user: User
}

export interface Player {
  id: number
  name: string
  /** index into KIT_COLORS */
  color: number
  /** true when an account is linked to this player */
  claimed: boolean
  isYou: boolean
  isOwner: boolean
  rating: number
}

export interface Match {
  id: number
  competitionId: number | null
  competitionName: string | null
  /** "Matchday 3", "Semi-finals", "Friendly" */
  roundLabel: string
  round: number
  slot: number
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
  /** knockout winner (including shoot-outs); null for draws and unplayed */
  winnerId: number | null
  /** rating change for the home player (away got the opposite); null if unplayed */
  ratingDelta: number | null
}

export interface LeaderRow {
  playerId: number
  rank: number
  rating: number
  /** change over the last five matches */
  trend: number
  played: number
  won: number
  drawn: number
  lost: number
  form: Outcome[]
}

export interface CompetitionSummary {
  id: number
  name: string
  format: Format
  status: 'active' | 'finished'
  playerCount: number
  played: number
  total: number
  championId: number | null
  /** league leader / player still alive with the best seed */
  leaderId: number | null
  createdAt: string
}

export interface CrewSummary {
  id: number
  name: string
  playerCount: number
  matchCount: number
  activeCompetitions: number
  myPlayerId: number
  myRating: number
  myRank: number
  isOwner: boolean
  updatedAt: string
}

export interface CrewDetail extends CrewSummary {
  inviteCode: string
  players: Player[]
  leaderboard: LeaderRow[]
  competitions: CompetitionSummary[]
  recent: Match[]
  upcoming: Match[]
  records: Records
}

export interface BracketRound {
  round: number
  name: string
  matches: Match[]
}

export interface Award {
  title: string
  playerId: number
  detail: string
}

export interface CompetitionDetail extends CompetitionSummary {
  crewId: number
  legs: 1 | 2
  points: { win: number; draw: number; loss: number }
  playerIds: number[]
  table: TableRow[] | null
  bracket: BracketRound[] | null
  /** fixtures grouped by round, in order */
  rounds: { round: number; name: string; matches: Match[] }[]
  awards: Award[]
  canDelete: boolean
}

export interface PlayerProfile {
  player: Player
  rank: number
  peakRating: number
  history: RatingPoint[]
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  cleanSheets: number
  winRate: number
  streak: { kind: Outcome; length: number } | null
  longestWinStreak: number
  biggestWin: { matchId: number; for: number; against: number } | null
  form: Outcome[]
  clubs: ClubUse[]
  headToHead: HeadToHead[]
  trophies: { competitionId: number; name: string }[]
  recent: Match[]
}

export interface Activity {
  id: number
  crewId: number
  crewName: string
  actorName: string
  isYou: boolean
  text: string
  createdAt: string
}

export interface Overview {
  crews: CrewSummary[]
  activity: Activity[]
}

export interface JoinPreview {
  crewId: number
  name: string
  playerCount: number
  alreadyMember: boolean
  /** players without an account yet — you can join as one of them */
  placeholders: { id: number; name: string }[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}
