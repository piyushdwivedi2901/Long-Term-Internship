import type { Currency } from './money.ts'
import type { Category } from './schemas.ts'
import type { Split } from './split.ts'

/**
 * Storage interface: SQLite on the server (server/sqliteRepository.ts),
 * in-memory + localStorage for the static demo (shared/memoryRepository.ts).
 * All rules live in services.ts.
 */
export interface UserRow { id: number; name: string; email: string; passwordHash: string; createdAt: string }
export interface GroupRow {
  id: number
  name: string
  emoji: string
  currency: Currency
  ownerId: number
  inviteCode: string
  createdAt: string
  updatedAt: string
}
export interface MemberRow { id: number; groupId: number; userId: number | null; name: string; createdAt: string }
export interface ExpenseRow {
  id: number
  groupId: number
  description: string
  amount: number
  paidBy: number
  date: string
  category: Category
  notes: string
  split: Split
  /** memberId → minor units, derived from `split` when saved */
  shares: Record<string, number>
  createdBy: number
  createdAt: string
  updatedAt: string
}
export interface SettlementRow {
  id: number
  groupId: number
  fromMember: number
  toMember: number
  amount: number
  date: string
  note: string
  createdBy: number
  createdAt: string
}
export interface ActivityRow { id: number; groupId: number; userId: number; actorName: string; text: string; createdAt: string }

type New<T> = Omit<T, 'id'>

export interface Table<Row extends { id: number }> {
  insert(row: New<Row>): Row
  byId(id: number): Row | undefined
  update(id: number, patch: Partial<New<Row>>): void
  delete(id: number): void
}

export interface Repository {
  users: Table<UserRow> & { byEmail(email: string): UserRow | undefined }
  groups: Table<GroupRow> & { byInviteCode(code: string): GroupRow | undefined }
  members: Table<MemberRow> & { listByGroup(groupId: number): MemberRow[]; listByUser(userId: number): MemberRow[] }
  expenses: Table<ExpenseRow> & { listByGroup(groupId: number): ExpenseRow[] }
  settlements: Table<SettlementRow> & { listByGroup(groupId: number): SettlementRow[] }
  activity: Table<ActivityRow> & { listByGroups(groupIds: number[], limit: number): ActivityRow[] }
  transaction<T>(fn: () => T): T
}
