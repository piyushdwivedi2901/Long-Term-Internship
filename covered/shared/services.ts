import { addDays, formatDate, resolveToday } from './dates.ts'
import { AppError, notFound, parse, unauthorized } from './errors.ts'
import { formatInr } from './money.ts'
import type { ClaimRow, FileMetaRow, ItemRow, Repository, UserRow } from './repository.ts'
import { samplePdfBase64 } from './samplePdf.ts'
import {
  MAX_FILES_PER_ITEM,
  MAX_FILE_BYTES,
  claimSchema,
  deleteAccountSchema,
  fileSchema,
  itemSchema,
  loginSchema,
  profileSchema,
  signupSchema,
  type FileType,
  type ItemInput,
} from './schemas.ts'
import type { Backup, Claim, Dashboard, FileMeta, ItemDetail, ItemSummary, Session, StoredFile, UpcomingEnd, User } from './types.ts'
import { itemStatus, layoutCoverages, meaningfulEnds, type ItemStatus } from './warranty.ts'

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}
export interface TokenSigner {
  sign(user: { id: number; email: string }): string
  verify(token: string): number | null
}
export interface ServiceDeps {
  repo: Repository
  passwords: PasswordHasher
  tokens: TokenSigner
  now?: () => Date
  /** Total size of bills and photos one account may store. */
  fileQuotaBytes?: number
}

export const MAX_ITEMS = 500
const DEFAULT_REMIND_DAYS = 30

const toUser = (u: UserRow): User => ({ id: u.id, name: u.name, email: u.email, remindDays: u.remindDays, createdAt: u.createdAt })

/** Decoded size of a base64 string. */
export const base64Bytes = (b64: string) => Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)

/**
 * Checks the first bytes of the file really match the type it claims to be,
 * so a renamed .exe can't be stored as a "PDF".
 */
export function sniffMatches(mime: FileType, b64: string): boolean {
  let head: number[]
  try {
    head = Array.from(atob(b64.slice(0, 24)), (c) => c.charCodeAt(0))
  } catch {
    return false
  }
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b)
  switch (mime) {
    case 'image/jpeg':
      return starts(0xff, 0xd8, 0xff)
    case 'image/png':
      return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'image/webp':
      return starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...head.slice(8, 12)) === 'WEBP'
    case 'application/pdf':
      return starts(0x25, 0x50, 0x44, 0x46) // %PDF
  }
}

/**
 * Every Covered rule. Methods take the acting user's id first; access is
 * decided here, once: you can only ever see and change your own things.
 */
export function createServices({ repo, passwords, tokens, now = () => new Date(), fileQuotaBytes = 100 * 1024 * 1024 }: ServiceDeps) {
  const stamp = () => now().toISOString()
  const todayFor = (input?: unknown) => resolveToday(input, now())

  // ---------- helpers ----------
  const userRow = (userId: number) => {
    const u = repo.users.byId(userId)
    if (!u) throw unauthorized()
    return u
  }

  /** Your item, or 404 — never reveal whether someone else's exists. */
  const ownItem = (userId: number, itemId: number): ItemRow => {
    const item = repo.items.byId(itemId)
    if (!item || item.userId !== userId) throw notFound('Item')
    return item
  }

  const toClaim = (c: ClaimRow): Claim => ({
    id: c.id,
    itemId: c.itemId,
    date: c.date,
    issue: c.issue,
    status: c.status,
    underWarranty: c.underWarranty,
    cost: c.cost,
    ticketNo: c.ticketNo,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  })
  const toFileMeta = (f: FileMetaRow): FileMeta => ({ id: f.id, itemId: f.itemId, name: f.name, mime: f.mime, size: f.size, createdAt: f.createdAt })

  const summarize = (item: ItemRow, today: string, remindDays: number): ItemSummary => {
    const views = layoutCoverages(item.purchaseDate, item.coverages, today)
    const s = itemStatus(views, today, remindDays)
    const claims = repo.claims.listByItem(item.id)
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      model: item.model,
      category: item.category,
      purchaseDate: item.purchaseDate,
      price: item.price,
      store: item.store,
      room: item.room,
      serialNo: item.serialNo,
      status: s.status,
      coveredUntil: s.coveredUntil,
      daysLeft: s.daysLeft,
      statusNote: s.note,
      fileCount: repo.files.listMetaByItem(item.id).length,
      openClaims: claims.filter((c) => c.status === 'open' || c.status === 'in_progress').length,
      updatedAt: item.updatedAt,
    }
  }

  const detail = (item: ItemRow, today: string, remindDays: number): ItemDetail => ({
    ...summarize(item, today, remindDays),
    invoiceNo: item.invoiceNo,
    notes: item.notes,
    support: item.support,
    coverages: layoutCoverages(item.purchaseDate, item.coverages, today),
    files: repo.files.listMetaByItem(item.id).map(toFileMeta),
    claims: repo.claims
      .listByItem(item.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
      .map(toClaim),
    createdAt: item.createdAt,
  })

  const validateItem = (input: unknown, today: string) => {
    const data = parse(itemSchema, input)
    if (data.purchaseDate > today) {
      throw new AppError(400, 'validation', "The purchase date can't be in the future", { purchaseDate: "The purchase date can't be in the future" })
    }
    return data
  }

  const deleteItemRows = (itemId: number) => {
    for (const f of repo.files.listMetaByItem(itemId)) repo.files.delete(f.id)
    for (const c of repo.claims.listByItem(itemId)) repo.claims.delete(c.id)
    repo.items.delete(itemId)
  }

  // ---------- auth ----------
  const auth = {
    async signup(input: unknown): Promise<Session> {
      const data = parse(signupSchema, input)
      if (repo.users.byEmail(data.email)) {
        throw new AppError(409, 'email_taken', 'An account with this email already exists', { email: 'An account with this email already exists' })
      }
      const passwordHash = await passwords.hash(data.password)
      const row = repo.users.insert({ name: data.name, email: data.email, passwordHash, remindDays: DEFAULT_REMIND_DAYS, createdAt: stamp() })
      return { token: tokens.sign(row), user: toUser(row) }
    },
    async login(input: unknown): Promise<Session> {
      const data = parse(loginSchema, input)
      const row = repo.users.byEmail(data.email)
      const ok = row ? await passwords.verify(data.password, row.passwordHash) : false
      if (!row || !ok) throw new AppError(401, 'bad_credentials', 'Email or password is incorrect')
      return { token: tokens.sign(row), user: toUser(row) }
    },
    authenticate(token: string | null | undefined): number {
      const id = token ? tokens.verify(token) : null
      if (id === null || !repo.users.byId(id)) throw unauthorized('Your session has ended. Sign in again.')
      return id
    },
    me: (userId: number): User => toUser(userRow(userId)),
    updateProfile(userId: number, input: unknown): User {
      const data = parse(profileSchema, input)
      userRow(userId)
      repo.users.update(userId, data)
      return auth.me(userId)
    },
    /** Deletes the account and everything in it — items, bills and repair history. */
    async deleteAccount(userId: number, input: unknown): Promise<void> {
      const { password } = parse(deleteAccountSchema, input)
      const u = userRow(userId)
      if (!(await passwords.verify(password, u.passwordHash))) {
        throw new AppError(400, 'bad_password', 'That password is incorrect', { password: 'That password is incorrect' })
      }
      repo.transaction(() => {
        for (const item of repo.items.listByUser(userId)) deleteItemRows(item.id)
        repo.users.delete(userId)
      })
    },
  }

  // ---------- items ----------
  const items = {
    list(userId: number, todayInput?: unknown): ItemSummary[] {
      const today = todayFor(todayInput)
      const { remindDays } = userRow(userId)
      return repo.items.listByUser(userId).map((i) => summarize(i, today, remindDays))
    },

    get(userId: number, itemId: number, todayInput?: unknown): ItemDetail {
      const today = todayFor(todayInput)
      return detail(ownItem(userId, itemId), today, userRow(userId).remindDays)
    },

    create(userId: number, input: unknown, todayInput?: unknown): ItemDetail {
      const today = todayFor(todayInput)
      const data = validateItem(input, today)
      if (repo.items.listByUser(userId).length >= MAX_ITEMS) throw new AppError(409, 'limit', `You can keep up to ${MAX_ITEMS} items`)
      const ts = stamp()
      const row = repo.items.insert({ userId, ...data, createdAt: ts, updatedAt: ts })
      return detail(row, today, userRow(userId).remindDays)
    },

    update(userId: number, itemId: number, input: unknown, todayInput?: unknown): ItemDetail {
      const today = todayFor(todayInput)
      ownItem(userId, itemId)
      const data = validateItem(input, today)
      const early = repo.claims.listByItem(itemId).find((c) => c.date < data.purchaseDate)
      if (early) {
        const msg = `A repair is logged on ${formatDate(early.date)}, before this purchase date`
        throw new AppError(409, 'validation', msg, { purchaseDate: msg })
      }
      repo.items.update(itemId, { ...data, updatedAt: stamp() })
      return items.get(userId, itemId, today)
    },

    remove(userId: number, itemId: number): void {
      ownItem(userId, itemId)
      repo.transaction(() => deleteItemRows(itemId))
    },
  }

  // ---------- bills & photos ----------
  const files = {
    add(userId: number, itemId: number, input: unknown): FileMeta {
      const item = ownItem(userId, itemId)
      const data = parse(fileSchema, input)
      const size = base64Bytes(data.data)
      if (size > MAX_FILE_BYTES) throw new AppError(413, 'too_large', 'Files can be up to 4 MB', { data: 'Files can be up to 4 MB' })
      if (!sniffMatches(data.mime, data.data)) {
        throw new AppError(400, 'validation', "This file isn't a real photo or PDF", { data: "This file isn't a real photo or PDF" })
      }
      if (repo.files.listMetaByItem(item.id).length >= MAX_FILES_PER_ITEM) {
        throw new AppError(409, 'limit', `An item can have up to ${MAX_FILES_PER_ITEM} files. Remove one first.`)
      }
      if (repo.files.countByUser(userId).bytes + size > fileQuotaBytes) {
        throw new AppError(507, 'quota', 'Your storage is full. Remove some old photos or bills first.')
      }
      const name = data.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
      return repo.transaction(() => {
        const row = repo.files.insert({ itemId, userId, name, mime: data.mime, size, data: data.data, createdAt: stamp() })
        repo.items.update(itemId, { updatedAt: stamp() })
        return toFileMeta(row)
      })
    },

    get(userId: number, fileId: number): StoredFile {
      const f = repo.files.byId(fileId)
      if (!f || f.userId !== userId) throw notFound('File')
      return { ...toFileMeta(f), data: f.data }
    },

    remove(userId: number, fileId: number): void {
      const f = repo.files.byId(fileId)
      if (!f || f.userId !== userId) throw notFound('File')
      repo.transaction(() => {
        repo.files.delete(fileId)
        repo.items.update(f.itemId, { updatedAt: stamp() })
      })
    },
  }

  // ---------- repairs & claims ----------
  const validateClaim = (item: ItemRow, input: unknown, today: string) => {
    const data = parse(claimSchema, input)
    if (data.date > today) throw new AppError(400, 'validation', "The date can't be in the future", { date: "The date can't be in the future" })
    if (data.date < item.purchaseDate) {
      const msg = `This is before you bought it (${formatDate(item.purchaseDate)})`
      throw new AppError(400, 'validation', msg, { date: msg })
    }
    return data
  }

  const claims = {
    create(userId: number, itemId: number, input: unknown, todayInput?: unknown): Claim {
      const item = ownItem(userId, itemId)
      const data = validateClaim(item, input, todayFor(todayInput))
      const ts = stamp()
      return repo.transaction(() => {
        const row = repo.claims.insert({ itemId, userId, ...data, createdAt: ts, updatedAt: ts })
        repo.items.update(itemId, { updatedAt: ts })
        return toClaim(row)
      })
    },

    update(userId: number, claimId: number, input: unknown, todayInput?: unknown): Claim {
      const c = repo.claims.byId(claimId)
      if (!c || c.userId !== userId) throw notFound('Repair')
      const data = validateClaim(ownItem(userId, c.itemId), input, todayFor(todayInput))
      repo.claims.update(claimId, { ...data, updatedAt: stamp() })
      return toClaim(repo.claims.byId(claimId)!)
    },

    remove(userId: number, claimId: number): void {
      const c = repo.claims.byId(claimId)
      if (!c || c.userId !== userId) throw notFound('Repair')
      repo.claims.delete(claimId)
    },
  }

  // ---------- dashboard & export ----------
  function dashboard(userId: number, todayInput?: unknown): Dashboard {
    const today = todayFor(todayInput)
    const { remindDays } = userRow(userId)
    const rows = repo.items.listByUser(userId)
    const list = rows.map((i) => summarize(i, today, remindDays))
    const counts: Record<ItemStatus, number> = { covered: 0, expiring: 0, partial: 0, expired: 0, none: 0 }
    for (const i of list) counts[i.status]++

    const upcoming: UpcomingEnd[] = []
    for (const item of rows) {
      for (const v of meaningfulEnds(layoutCoverages(item.purchaseDate, item.coverages, today))) {
        if (v.state === 'expired' || v.daysLeft > 180) continue
        upcoming.push({ itemId: item.id, itemName: item.name, category: item.category, kind: v.kind, label: v.label, provider: v.provider, end: v.end, daysLeft: v.daysLeft })
      }
    }
    upcoming.sort((a, b) => a.daysLeft - b.daysLeft || a.itemName.localeCompare(b.itemName))

    const names = new Map(rows.map((r) => [r.id, r.name]))
    const allClaims = repo.claims.listByUser(userId)
    const priced = (status: ItemStatus[]) => list.filter((i) => status.includes(i.status)).reduce((n, i) => n + (i.price ?? 0), 0)

    return {
      today,
      remindDays,
      itemCount: list.length,
      counts,
      totalValue: priced(['covered', 'expiring', 'partial', 'expired', 'none']),
      protectedValue: priced(['covered', 'expiring', 'partial']),
      upcoming: upcoming.slice(0, 8),
      openClaims: allClaims
        .filter((c) => c.status === 'open' || c.status === 'in_progress')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((c) => ({ ...toClaim(c), itemName: names.get(c.itemId) ?? '' })),
      repairs: {
        count: allClaims.length,
        underWarranty: allClaims.filter((c) => c.underWarranty).length,
        spent: allClaims.reduce((n, c) => n + c.cost, 0),
      },
      recent: [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id).slice(0, 4),
      missingBills: list.filter((i) => i.fileCount === 0).length,
    }
  }

  /** Everything except the file contents, as one JSON document. */
  function exportAll(userId: number, todayInput?: unknown): Backup {
    const today = todayFor(todayInput)
    const u = userRow(userId)
    return {
      app: 'covered',
      version: 1,
      exportedAt: stamp(),
      user: { name: u.name, email: u.email, remindDays: u.remindDays },
      items: repo.items.listByUser(userId).map((i) => detail(i, today, u.remindDays)),
    }
  }

  /** Ten everyday purchases, each a different warranty situation, with real (sample) PDF bills. */
  function seedSample(userId: number, todayInput?: unknown): ItemSummary[] {
    const today = todayFor(todayInput)
    const d = (n: number) => addDays(today, -n)
    type Seed = ItemInput & { bill?: boolean; claims?: Parameters<typeof claims.create>[2][] }
    const seeds: Seed[] = [
      {
        name: 'Living room AC',
        brand: 'Voltas',
        model: '1.5 T 5-star inverter split',
        category: 'appliances',
        purchaseDate: d(340),
        price: 4_299_000,
        store: 'Brightline Electronics, Phoenix Mall',
        invoiceNo: 'BLE-24-118375',
        serialNo: 'VTS185VX5521',
        room: 'Living room',
        support: { phone: '', email: '', website: 'https://www.voltas.com' },
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'Voltas' },
          { kind: 'component', label: 'Compressor', months: 60, provider: 'Voltas' },
        ],
        notes: 'Installed by the store team. Free service visit included in the first year.',
        bill: true,
      },
      {
        name: 'Refrigerator',
        brand: 'LG',
        model: 'Double door, 343 L',
        category: 'kitchen',
        purchaseDate: d(800),
        price: 3_849_000,
        store: 'Metro Digital',
        invoiceNo: 'MD-7781-0042',
        serialNo: '304KRCX4S112',
        room: 'Kitchen',
        support: { phone: '', email: '', website: 'https://www.lg.com/in' },
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'LG' },
          { kind: 'component', label: 'Compressor', months: 120, provider: 'LG' },
        ],
        bill: true,
        claims: [{ date: d(520), issue: 'Not cooling — gas leak at the condenser', status: 'resolved', underWarranty: true, cost: 0, ticketNo: 'LG-RNP-5520', notes: 'Technician fixed the leak and refilled the gas.' }],
      },
      {
        name: 'Phone',
        brand: 'Samsung',
        model: 'Galaxy S24, 256 GB',
        category: 'phones',
        purchaseDate: d(200),
        price: 7_499_900,
        store: 'Online order',
        invoiceNo: '403-5521887-1120',
        serialNo: 'R5CX21ABCDE',
        support: { phone: '', email: '', website: 'https://www.samsung.com/in/support' },
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'Samsung' },
          { kind: 'extended', label: 'Samsung Care+', months: 12, provider: 'Samsung' },
        ],
        bill: true,
        claims: [{ date: d(3), issue: 'Battery drains overnight', status: 'in_progress', underWarranty: true, cost: 0, ticketNo: 'SC-48211', notes: 'Dropped at the service centre. They said 3–5 working days.' }],
      },
      {
        name: 'Work laptop',
        brand: 'Dell',
        model: 'Inspiron 14',
        category: 'computers',
        purchaseDate: d(420),
        price: 6_249_000,
        store: 'Laptop World',
        invoiceNo: 'DL-IN-993012',
        serialNo: 'CN-7XK2Q93',
        room: 'Study',
        support: { phone: '', email: '', website: 'https://www.dell.com/support' },
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'Dell' },
          { kind: 'extended', label: 'Extended', months: 24, provider: 'Dell' },
        ],
        bill: true,
      },
      {
        name: 'Washing machine',
        brand: 'IFB',
        model: 'Front load, 8 kg',
        category: 'appliances',
        purchaseDate: d(1400),
        price: 3_599_000,
        store: 'Sharma Electronics',
        invoiceNo: 'VS-2022-44781',
        serialNo: 'IFB8KG77120',
        room: 'Utility',
        support: { phone: '', email: '', website: 'https://www.ifbappliances.com' },
        coverages: [
          { kind: 'standard', label: 'Standard', months: 48, provider: 'IFB' },
          { kind: 'component', label: 'Motor', months: 120, provider: 'IFB' },
        ],
      },
      {
        name: 'Water purifier',
        brand: 'Kent',
        model: 'RO + UV',
        category: 'kitchen',
        purchaseDate: d(900),
        price: 1_849_900,
        store: 'Authorised dealer, Sector 18',
        invoiceNo: 'KT-55120',
        room: 'Kitchen',
        coverages: [{ kind: 'standard', label: 'Standard', months: 12, provider: 'Kent' }],
        bill: true,
        claims: [{ date: d(60), issue: 'Filter change and service', status: 'resolved', underWarranty: false, cost: 185_000, ticketNo: '', notes: 'Annual service — paid.' }],
      },
      {
        name: 'Bedroom fan',
        brand: 'Havells',
        model: 'BLDC ceiling fan',
        category: 'appliances',
        purchaseDate: d(60),
        price: 499_000,
        store: 'Local electrical shop',
        room: 'Bedroom',
        coverages: [{ kind: 'standard', label: 'Standard', months: 24, provider: 'Havells' }],
      },
      {
        name: 'Living room TV',
        brand: 'Sony',
        model: 'Bravia 55" 4K',
        category: 'tv',
        purchaseDate: d(700),
        price: 6_799_000,
        store: 'Brightline Electronics',
        invoiceNo: 'BLE-23-998120',
        serialNo: 'SNY55X75K9921',
        room: 'Living room',
        coverages: [
          { kind: 'standard', label: 'Standard', months: 12, provider: 'Sony' },
          { kind: 'component', label: 'Panel', months: 24, provider: 'Sony' },
        ],
        bill: true,
      },
      {
        name: 'Sofa set',
        brand: 'Urban Ladder',
        model: '3-seater fabric',
        category: 'furniture',
        purchaseDate: d(150),
        price: 4_250_000,
        store: 'Online order',
        invoiceNo: 'UL-ORD-778120',
        room: 'Living room',
        coverages: [{ kind: 'standard', label: 'Standard', months: 12, provider: 'Urban Ladder' }],
        bill: true,
      },
      {
        name: 'Electric scooter',
        brand: 'Ather',
        model: '450X',
        category: 'vehicles',
        purchaseDate: d(500),
        price: 14_599_900,
        store: 'Brand showroom, Koramangala',
        invoiceNo: 'ATH-BLR-22091',
        serialNo: 'MD9AT450X22091',
        coverages: [
          { kind: 'standard', label: 'Vehicle', months: 36, provider: 'Ather' },
          { kind: 'component', label: 'Battery', months: 60, provider: 'Ather' },
        ],
        bill: true,
      },
    ]
    return repo.transaction(() => {
      for (const { bill, claims: claimSeeds = [], ...input } of seeds) {
        const item = items.create(userId, input, today)
        if (bill) {
          const amount = input.price ? formatInr(input.price).replace('₹', 'Rs. ') : '-'
          files.add(userId, item.id, {
            name: `Invoice ${input.invoiceNo || item.id}.pdf`,
            mime: 'application/pdf',
            data: samplePdfBase64({
              store: (input.store ?? '').split(',')[0] || 'Store',
              invoiceNo: input.invoiceNo || String(item.id),
              date: formatDate(input.purchaseDate),
              lines: [[`${input.brand} ${input.model}`.trim(), amount], ['Delivery & installation', 'Rs. 0']],
              total: amount,
              footer: input.serialNo ? `Serial no. ${input.serialNo}. Keep this invoice for warranty claims.` : 'Keep this invoice for warranty claims.',
            }),
          })
        }
        for (const c of claimSeeds) claims.create(userId, item.id, c, today)
      }
      return items.list(userId, today)
    })
  }

  return { auth, items, files, claims, dashboard, exportAll, seedSample }
}

export type Services = ReturnType<typeof createServices>
