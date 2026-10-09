import { AppError } from '../../shared/errors.ts'
import { createMemoryRepository, emptySnapshot, type Snapshot } from '../../shared/memoryRepository.ts'
import { createServices, type PasswordHasher, type TokenSigner } from '../../shared/services.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

export const DEMO_STORAGE_KEY = 'covered:demo-db:v1'
/**
 * Browsers give a site about 5 MB of localStorage, shared by everything on
 * the same domain — so the demo keeps bills and photos under 2 MB in total.
 */
export const DEMO_FILE_QUOTA = 2 * 1024 * 1024

const hex = (b: ArrayBuffer | Uint8Array) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 100_000 }, key, 256))
}

/** PBKDF2 (WebCrypto): real hashing even though demo data stays in this browser. */
export const pbkdf2Hasher: PasswordHasher = {
  async hash(p) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    return `pbkdf2$${hex(salt)}$${await derive(p, salt)}`
  },
  async verify(p, stored) {
    const [scheme, saltHex, hash] = stored.split('$')
    if (scheme !== 'pbkdf2' || !saltHex || !hash) return false
    return (await derive(p, new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16))))) === hash
  },
}

interface Stored {
  db: Snapshot
  sessions: [string, number][]
}

const base64ToBlob = (b64: string, type: string) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

/**
 * The complete Covered backend running in the browser — the same services
 * and validation as the Express server, over an in-memory repository
 * persisted to localStorage. Used for the static GitHub Pages deployment.
 */
export function createDemoClient(getToken: TokenGetter, { storage = globalThis.localStorage, latencyMs = 120 }: { storage?: Storage; latencyMs?: number } = {}): ApiClient {
  let lastRaw: string | null = null
  let sessions = new Map<string, number>()
  let snapshot: Snapshot = emptySnapshot()
  /** set when a write couldn't be saved because storage is full */
  let saveFailed = false

  const persist = () => {
    const raw = JSON.stringify({ db: snapshot, sessions: [...sessions] } satisfies Stored)
    try {
      storage?.setItem(DEMO_STORAGE_KEY, raw)
      lastRaw = raw
    } catch {
      saveFailed = true
    }
  }
  const tokens: TokenSigner = {
    sign(user) {
      const t = `demo.${hex(crypto.getRandomValues(new Uint8Array(16)))}`
      sessions.set(t, user.id)
      persist()
      return t
    },
    verify: (t) => sessions.get(t) ?? null,
  }
  const build = () =>
    createServices({
      repo: createMemoryRepository(snapshot, (next) => {
        snapshot = next
        persist()
      }),
      passwords: pbkdf2Hasher,
      tokens,
      fileQuotaBytes: DEMO_FILE_QUOTA,
    })
  let s = build()

  /**
   * Another tab (or another account in this browser) may have written since
   * we last looked: reload so the demo behaves like one shared database.
   */
  const load = (raw: string | null) => {
    lastRaw = raw
    try {
      const parsed = raw ? (JSON.parse(raw) as Stored) : null
      if (parsed?.db?.version === 1) {
        snapshot = parsed.db
        sessions = new Map(parsed.sessions)
      } else {
        snapshot = emptySnapshot()
        sessions = new Map()
      }
    } catch {
      snapshot = emptySnapshot()
      sessions = new Map()
    }
    s = build()
  }
  const sync = () => {
    let raw: string | null = null
    try {
      raw = storage?.getItem(DEMO_STORAGE_KEY) ?? null
    } catch {
      return
    }
    if (raw !== lastRaw) load(raw)
  }
  sync()

  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve())

  async function run<T>(fn: () => T | Promise<T>): Promise<T> {
    await wait()
    sync()
    const before = lastRaw
    saveFailed = false
    try {
      const result = await fn()
      if (saveFailed) {
        // Never pretend something was saved: undo the in-memory change too.
        load(before)
        throw new ApiError(507, 'storage_full', "This browser's storage is full, so that wasn't saved. Remove some photos, or run Covered with its server for unlimited space.")
      }
      return result
    } catch (err) {
      if (err instanceof AppError) throw new ApiError(err.status, err.code, err.message, err.fields)
      throw err
    }
  }
  const as = <T>(fn: (uid: number) => T | Promise<T>) => run(() => fn(s.auth.authenticate(getToken())))

  return {
    mode: 'demo',
    signup: (i) => run(() => s.auth.signup(i)),
    login: (i) => run(() => s.auth.login(i)),
    me: () => as((u) => s.auth.me(u)),
    updateProfile: (i) => as((u) => s.auth.updateProfile(u, i)),
    deleteAccount: (i) =>
      as(async (u) => {
        await s.auth.deleteAccount(u, i)
        for (const [t, id] of sessions) if (id === u) sessions.delete(t)
        persist()
      }),

    dashboard: (today) => as((u) => s.dashboard(u, today)),
    listItems: (today) => as((u) => s.items.list(u, today)),
    getItem: (id, today) => as((u) => s.items.get(u, id, today)),
    createItem: (i, today) => as((u) => s.items.create(u, i, today)),
    updateItem: (id, i, today) => as((u) => s.items.update(u, id, i, today)),
    deleteItem: (id) => as((u) => s.items.remove(u, id)),

    uploadFile: (itemId, i) => as((u) => s.files.add(u, itemId, i)),
    fileBlob: (id) =>
      as((u) => {
        const f = s.files.get(u, id)
        return base64ToBlob(f.data, f.mime)
      }),
    deleteFile: (id) => as((u) => s.files.remove(u, id)),

    createClaim: (itemId, i, today) => as((u) => s.claims.create(u, itemId, i, today)),
    updateClaim: (id, i, today) => as((u) => s.claims.update(u, id, i, today)),
    deleteClaim: (id) => as((u) => s.claims.remove(u, id)),

    exportAll: (today) => as((u) => s.exportAll(u, today)),
    seedSample: (today) => as((u) => s.seedSample(u, today)),
  }
}
