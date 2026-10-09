import type { Category, ClaimStatus, CoverageKind, FileType } from './schemas.ts'
import type { CoverageView, ItemStatus } from './warranty.ts'

export type { Category, ClaimStatus, CoverageKind, CoverageView, FileType, ItemStatus }

export interface User {
  id: number
  name: string
  email: string
  /** how many days before a cover ends to call it "expiring" and to remind */
  remindDays: number
  createdAt: string
}

export interface Session {
  token: string
  user: User
}

export interface ItemSummary {
  id: number
  name: string
  brand: string
  model: string
  category: Category
  purchaseDate: string
  price: number | null
  store: string
  room: string
  serialNo: string
  status: ItemStatus
  coveredUntil: string | null
  daysLeft: number | null
  statusNote: string
  fileCount: number
  openClaims: number
  updatedAt: string
}

export interface FileMeta {
  id: number
  itemId: number
  name: string
  mime: FileType
  size: number
  createdAt: string
}
export interface StoredFile extends FileMeta {
  /** base64 */
  data: string
}

export interface Claim {
  id: number
  itemId: number
  date: string
  issue: string
  status: ClaimStatus
  underWarranty: boolean
  cost: number
  ticketNo: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ItemDetail extends ItemSummary {
  invoiceNo: string
  notes: string
  support: { phone: string; email: string; website: string }
  coverages: CoverageView[]
  files: FileMeta[]
  claims: Claim[]
  createdAt: string
}

export interface UpcomingEnd {
  itemId: number
  itemName: string
  category: Category
  kind: CoverageKind
  label: string
  provider: string
  end: string
  daysLeft: number
}

export interface Dashboard {
  today: string
  remindDays: number
  itemCount: number
  counts: Record<ItemStatus, number>
  /** paise */
  totalValue: number
  /** paise of things that still have some cover */
  protectedValue: number
  /** covers ending in the next 180 days, soonest first */
  upcoming: UpcomingEnd[]
  openClaims: (Claim & { itemName: string })[]
  /** paise spent on repairs, and how many were done under warranty */
  repairs: { count: number; underWarranty: number; spent: number }
  recent: ItemSummary[]
  missingBills: number
}

export interface Backup {
  app: 'covered'
  version: 1
  exportedAt: string
  user: { name: string; email: string; remindDays: number }
  items: ItemDetail[]
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> }
}
