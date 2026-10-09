import type { ClaimInput, FileInput, ItemInput, LoginInput, ProfileInput, SignupInput } from '../../shared/schemas.ts'
import type { Backup, Claim, Dashboard, FileMeta, ItemDetail, ItemSummary, Session, User } from '../../shared/types.ts'

export type BackendMode = 'server' | 'demo'

/**
 * Everything the UI can ask of the backend — implemented over HTTP and
 * in-browser. Methods that depend on the date take the user's local day.
 */
export interface ApiClient {
  mode: BackendMode
  signup(i: SignupInput): Promise<Session>
  login(i: LoginInput): Promise<Session>
  me(): Promise<User>
  updateProfile(i: ProfileInput): Promise<User>
  deleteAccount(i: { password: string }): Promise<void>

  dashboard(today: string): Promise<Dashboard>
  listItems(today: string): Promise<ItemSummary[]>
  getItem(id: number, today: string): Promise<ItemDetail>
  createItem(i: ItemInput, today: string): Promise<ItemDetail>
  updateItem(id: number, i: ItemInput, today: string): Promise<ItemDetail>
  deleteItem(id: number): Promise<void>

  uploadFile(itemId: number, i: FileInput): Promise<FileMeta>
  fileBlob(fileId: number): Promise<Blob>
  deleteFile(fileId: number): Promise<void>

  createClaim(itemId: number, i: ClaimInput, today: string): Promise<Claim>
  updateClaim(id: number, i: ClaimInput, today: string): Promise<Claim>
  deleteClaim(id: number): Promise<void>

  exportAll(today: string): Promise<Backup>
  seedSample(today: string): Promise<ItemSummary[]>
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
