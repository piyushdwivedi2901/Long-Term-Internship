import type { CompetitionInput, CrewInput, FriendlyInput, JoinInput, LoginInput, PlayerInput, ProfileInput, ResultInput, SignupInput } from '../../shared/schemas.ts'
import type { Activity, CompetitionDetail, CrewDetail, CrewSummary, JoinPreview, Match, Overview, Player, PlayerProfile, Session, User } from '../../shared/types.ts'

export type BackendMode = 'server' | 'demo'

/** Everything the UI can ask of the backend — implemented over HTTP and in-browser. */
export interface ApiClient {
  mode: BackendMode
  signup(i: SignupInput): Promise<Session>
  login(i: LoginInput): Promise<Session>
  me(): Promise<User>
  updateProfile(i: ProfileInput): Promise<User>
  deleteAccount(i: { password: string }): Promise<void>

  overview(): Promise<Overview>
  seedSample(): Promise<CrewSummary[]>

  getCrew(id: number): Promise<CrewDetail>
  createCrew(i: CrewInput): Promise<CrewDetail>
  renameCrew(id: number, name: string): Promise<CrewDetail>
  deleteCrew(id: number): Promise<void>
  regenerateInvite(id: number): Promise<CrewDetail>
  leaveCrew(id: number): Promise<void>
  previewInvite(code: string): Promise<JoinPreview>
  joinCrew(i: JoinInput): Promise<CrewDetail>
  crewActivity(id: number): Promise<Activity[]>

  addPlayer(crewId: number, i: PlayerInput): Promise<Player>
  updatePlayer(crewId: number, playerId: number, i: PlayerInput): Promise<Player>
  removePlayer(crewId: number, playerId: number): Promise<void>
  playerProfile(crewId: number, playerId: number): Promise<PlayerProfile>

  createCompetition(crewId: number, i: CompetitionInput): Promise<CompetitionDetail>
  getCompetition(id: number): Promise<CompetitionDetail>
  renameCompetition(id: number, name: string): Promise<CompetitionDetail>
  deleteCompetition(id: number): Promise<void>

  listMatches(crewId: number): Promise<Match[]>
  recordResult(matchId: number, i: ResultInput): Promise<Match>
  clearResult(matchId: number): Promise<void>
  addFriendly(crewId: number, i: FriendlyInput): Promise<Match>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export type TokenGetter = () => string | null
