import { AppError } from '../../shared/errors.ts'
import { createMemoryRepository, emptySnapshot, type Snapshot } from '../../shared/memoryRepository.ts'
import { createServices, type PasswordHasher, type TokenSigner } from '../../shared/services.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

export const DEMO_STORAGE_KEY = 'couchcup:demo-db:v1'

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


/**
 * The complete Couch Cup backend running in the browser — the same services
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
        throw new ApiError(507, 'storage_full', "This browser's storage is full, so that wasn't saved. Delete an old crew or competition, or run Couch Cup with its server.")
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

    overview: () => as((u) => s.overview(u)),
    seedSample: () => as((u) => s.seedSample(u)),

    getCrew: (id) => as((u) => s.crews.get(u, id)),
    createCrew: (i) => as((u) => s.crews.create(u, i)),
    renameCrew: (id, name) => as((u) => s.crews.update(u, id, { name })),
    deleteCrew: (id) => as((u) => s.crews.remove(u, id)),
    regenerateInvite: (id) => as((u) => s.crews.regenerateInvite(u, id)),
    leaveCrew: (id) => as((u) => s.crews.leave(u, id)),
    previewInvite: (code) => as((u) => s.crews.previewInvite(u, { code })),
    joinCrew: (i) => as((u) => s.crews.join(u, i)),
    crewActivity: (id) => as((u) => s.activity(u, id, 30)),

    addPlayer: (id, i) => as((u) => s.players.add(u, id, i)),
    updatePlayer: (id, pid, i) => as((u) => s.players.update(u, id, pid, i)),
    removePlayer: (id, pid) => as((u) => s.players.remove(u, id, pid)),
    playerProfile: (id, pid) => as((u) => s.players.profile(u, id, pid)),

    createCompetition: (id, i) => as((u) => s.competitions.create(u, id, i)),
    getCompetition: (id) => as((u) => s.competitions.get(u, id)),
    renameCompetition: (id, name) => as((u) => s.competitions.rename(u, id, { name })),
    deleteCompetition: (id) => as((u) => s.competitions.remove(u, id)),

    listMatches: (id) => as((u) => s.matches.list(u, id)),
    recordResult: (mid, i) => as((u) => s.matches.record(u, mid, i)),
    clearResult: (mid) => as((u) => s.matches.clear(u, mid)),
    addFriendly: (id, i) => as((u) => s.matches.friendly(u, id, i)),
  }
}
