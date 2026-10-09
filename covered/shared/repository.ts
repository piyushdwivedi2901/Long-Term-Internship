import type { Category, ClaimStatus, Coverage, FileType } from './schemas.ts'

/**
 * Storage interface: SQLite on the server (server/sqliteRepository.ts),
 * in-memory + localStorage for the static demo (shared/memoryRepository.ts).
 * All rules live in services.ts.
 */
export interface UserRow { id: number; name: string; email: string; passwordHash: string; remindDays: number; createdAt: string }
export interface ItemRow {
  id: number
  userId: number
  name: string
  brand: string
  model: string
  category: Category
  purchaseDate: string
  price: number | null
  store: string
  invoiceNo: string
  serialNo: string
  room: string
  notes: string
  support: { phone: string; email: string; website: string }
  coverages: Coverage[]
  createdAt: string
  updatedAt: string
}
export interface ClaimRow {
  id: number
  itemId: number
  userId: number
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
export interface FileRow { id: number; itemId: number; userId: number; name: string; mime: FileType; size: number; data: string; createdAt: string }
/** A file without its (large) contents. */
export type FileMetaRow = Omit<FileRow, 'data'>

type New<T> = Omit<T, 'id'>

export interface Table<Row extends { id: number }> {
  insert(row: New<Row>): Row
  byId(id: number): Row | undefined
  update(id: number, patch: Partial<New<Row>>): void
  delete(id: number): void
}

export interface Repository {
  users: Table<UserRow> & { byEmail(email: string): UserRow | undefined }
  items: Table<ItemRow> & { listByUser(userId: number): ItemRow[] }
  claims: Table<ClaimRow> & { listByItem(itemId: number): ClaimRow[]; listByUser(userId: number): ClaimRow[] }
  files: Omit<Table<FileRow>, 'update'> & {
    listMetaByItem(itemId: number): FileMetaRow[]
    countByUser(userId: number): { count: number; bytes: number }
  }
  transaction<T>(fn: () => T): T
}
