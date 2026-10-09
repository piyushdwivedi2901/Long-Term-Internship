import { AppError } from '../../shared/errors.ts'
import { createMemoryRepository, emptySnapshot, type Snapshot } from '../../shared/memoryRepository.ts'
import { createServices, type PasswordHasher, type TokenSigner } from '../../shared/services.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

export const DEMO_STORAGE_KEY = 'fairshare:demo-db:v1'

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
 * The complete Fairshare backend running in the browser — the same services
 * and validation as the Express server, over an in-memory repository
 * persisted to localStorage. Used for the static GitHub Pages deployment.
 */
export function createDemoClient(getToken: TokenGetter, { storage = globalThis.localStorage, latencyMs = 120 }: { storage?: Storage; latencyMs?: number } = {}): ApiClient {
  let lastRaw: string | null = null
  let sessions = new Map<string, number>()
  let snapshot: Snapshot = emptySnapshot()

  const persist = () => {
    try {
      lastRaw = JSON.stringify({ db: snapshot, sessions: [...sessions] } satisfies Stored)
      storage?.setItem(DEMO_STORAGE_KEY, lastRaw)
    } catch {
      /* storage full: keep working in memory */
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
  const sync = () => {
    let raw: string | null = null
    try {
      raw = storage?.getItem(DEMO_STORAGE_KEY) ?? null
    } catch {
      return
    }
    if (raw === lastRaw) return
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
  sync()

  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve())

  async function run<T>(fn: () => T | Promise<T>): Promise<T> {
    await wait()
    sync()
    try {
      return await fn()
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
    seedSample: (today) => as((u) => s.seedSample(u, today)),
    listGroups: () => as((u) => s.groups.list(u)),
    getGroup: (id) => as((u) => s.groups.get(u, id)),
    createGroup: (i) => as((u) => s.groups.create(u, i)),
    updateGroup: (id, p) => as((u) => s.groups.update(u, id, p)),
    deleteGroup: (id) => as((u) => s.groups.remove(u, id)),
    regenerateInvite: (id) => as((u) => s.groups.regenerateInvite(u, id)),
    leaveGroup: (id) => as((u) => s.groups.leave(u, id)),
    previewInvite: (code) => as((u) => s.groups.previewInvite(u, { code })),
    joinGroup: (i) => as((u) => s.groups.join(u, i)),
    addMember: (id, name) => as((u) => s.members.add(u, id, { name })),
    renameMember: (id, mid, name) => as((u) => s.members.rename(u, id, mid, { name })),
    removeMember: (id, mid) => as((u) => s.members.remove(u, id, mid)),
    listExpenses: (id) => as((u) => s.expenses.list(u, id)),
    createExpense: (id, i) => as((u) => s.expenses.create(u, id, i)),
    updateExpense: (id, eid, i) => as((u) => s.expenses.update(u, id, eid, i)),
    deleteExpense: (id, eid) => as((u) => s.expenses.remove(u, id, eid)),
    listSettlements: (id) => as((u) => s.settlements.list(u, id)),
    createSettlement: (id, i) => as((u) => s.settlements.create(u, id, i)),
    deleteSettlement: (id, sid) => as((u) => s.settlements.remove(u, id, sid)),
    insights: (id, today) => as((u) => s.insights(u, id, today)),
    activity: (id) => as((u) => s.activity(u, id, 30)),
  }
}
