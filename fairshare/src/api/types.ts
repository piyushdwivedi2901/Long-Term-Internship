import type { ExpenseInput, GroupInput, GroupPatch, JoinInput, LoginInput, ProfileInput, SettlementInput, SignupInput } from '../../shared/schemas.ts'
import type { Activity, Expense, GroupDetail, GroupSummary, Insights, JoinPreview, Member, Overview, Session, Settlement, User } from '../../shared/types.ts'

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
  seedSample(today: string): Promise<GroupSummary[]>

  listGroups(): Promise<GroupSummary[]>
  getGroup(id: number): Promise<GroupDetail>
  createGroup(i: GroupInput): Promise<GroupDetail>
  updateGroup(id: number, p: GroupPatch): Promise<GroupDetail>
  deleteGroup(id: number): Promise<void>
  regenerateInvite(id: number): Promise<GroupDetail>
  leaveGroup(id: number): Promise<void>
  previewInvite(code: string): Promise<JoinPreview>
  joinGroup(i: JoinInput): Promise<GroupDetail>

  addMember(groupId: number, name: string): Promise<Member>
  renameMember(groupId: number, memberId: number, name: string): Promise<Member>
  removeMember(groupId: number, memberId: number): Promise<void>

  listExpenses(groupId: number): Promise<Expense[]>
  createExpense(groupId: number, i: ExpenseInput): Promise<Expense>
  updateExpense(groupId: number, id: number, i: ExpenseInput): Promise<Expense>
  deleteExpense(groupId: number, id: number): Promise<void>

  listSettlements(groupId: number): Promise<Settlement[]>
  createSettlement(groupId: number, i: SettlementInput): Promise<Settlement>
  deleteSettlement(groupId: number, id: number): Promise<void>

  insights(groupId: number, today: string): Promise<Insights>
  activity(groupId: number): Promise<Activity[]>
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
