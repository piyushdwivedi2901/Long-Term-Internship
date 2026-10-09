import type { Currency } from './money.ts'
import type { Category } from './schemas.ts'
import type { Split } from './split.ts'
import type { MemberBalance, Transfer } from './balances.ts'

export type { Currency, Category, Split, MemberBalance, Transfer }

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

export interface Member {
  id: number
  name: string
  /** true when a Fairshare account is linked to this person */
  claimed: boolean
  /** true for the signed-in user's own member row */
  isYou: boolean
  isOwner: boolean
}

export interface GroupSummary {
  id: number
  name: string
  emoji: string
  currency: Currency
  memberCount: number
  myMemberId: number
  /** positive = you are owed, negative = you owe (minor units) */
  myBalance: number
  isOwner: boolean
  updatedAt: string
}

export interface GroupDetail extends GroupSummary {
  inviteCode: string
  members: Member[]
  balances: MemberBalance[]
  plan: Transfer[]
  expenseCount: number
}

export interface Expense {
  id: number
  groupId: number
  description: string
  amount: number
  paidBy: number
  date: string
  category: Category
  notes: string
  split: Split
  shares: { memberId: number; amount: number }[]
  createdByName: string
  canEdit: boolean
  createdAt: string
  updatedAt: string
}

export interface Settlement {
  id: number
  groupId: number
  fromMember: number
  toMember: number
  amount: number
  date: string
  note: string
  canDelete: boolean
  createdAt: string
}

export interface Activity {
  id: number
  groupId: number
  groupName: string
  groupEmoji: string
  actorName: string
  isYou: boolean
  text: string
  createdAt: string
}

export interface Insights {
  total: number
  byCategory: { category: Category; amount: number; count: number }[]
  /** last 6 months, oldest first, "YYYY-MM" */
  byMonth: { month: string; amount: number }[]
  perMember: { memberId: number; paid: number; share: number }[]
}

export interface Overview {
  totals: { currency: Currency; owed: number; owe: number }[]
  groups: GroupSummary[]
  activity: Activity[]
}

export interface JoinPreview {
  groupId: number
  name: string
  emoji: string
  currency: Currency
  memberCount: number
  alreadyMember: boolean
  /** people in the group without an account yet — you can join as one of them */
  placeholders: { id: number; name: string }[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}
