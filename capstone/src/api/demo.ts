import { AppError } from '../../shared/errors.ts'
import { createMemoryRepository, emptySnapshot, type Snapshot } from '../../shared/memoryRepository.ts'
import { createServices, type PasswordHasher, type TokenSigner } from '../../shared/services.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

export const DEMO_STORAGE_KEY = 'flowboard:demo-db:v1'

const hex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

/** PBKDF2 via WebCrypto — real hashing, even though the data stays in this browser. */
export const pbkdf2Hasher: PasswordHasher = {
  async hash(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    return `pbkdf2$${hex(salt)}$${await derive(password, salt)}`
  },
  async verify(password, stored) {
    const [scheme, saltHex, hash] = stored.split('$')
    if (scheme !== 'pbkdf2' || !saltHex || !hash) return false
    const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)))
    return (await derive(password, salt)) === hash
  },
}

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 100_000 }, key, 256)
  return hex(bits)
}

/** Opaque per-session tokens kept in the demo database's session list. */
function sessionTokens(sessions: Map<string, number>, persist: () => void): TokenSigner {
  return {
    sign(user) {
      const token = `demo.${hex(crypto.getRandomValues(new Uint8Array(16)))}`
      sessions.set(token, user.id)
      persist()
      return token
    },
    verify: (token) => sessions.get(token) ?? null,
  }
}

interface Stored {
  db: Snapshot
  sessions: [string, number][]
}

function load(storage: Storage | undefined): Stored {
  try {
    const raw = storage?.getItem(DEMO_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Stored
      if (parsed?.db?.version === 1) return parsed
    }
  } catch {
    /* unreadable → start fresh */
  }
  return { db: emptySnapshot(), sessions: [] }
}

/**
 * The full Flowboard backend running inside the browser: the same services
 * and validation the Express server uses, over an in-memory repository that
 * persists to localStorage. Used for the static GitHub Pages deployment.
 */
export function createDemoClient(
  getToken: TokenGetter,
  { storage = globalThis.localStorage, latencyMs = 120 }: { storage?: Storage; latencyMs?: number } = {},
): ApiClient {
  const stored = load(storage)
  const sessions = new Map(stored.sessions)
  let snapshot = stored.db
  const persist = () => {
    try {
      storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify({ db: snapshot, sessions: [...sessions] } satisfies Stored))
    } catch {
      /* storage full / unavailable: keep working in memory */
    }
  }
  const repo = createMemoryRepository(snapshot, (s) => {
    snapshot = s
    persist()
  })
  const services = createServices({ repo, passwords: pbkdf2Hasher, tokens: sessionTokens(sessions, persist) })

  const wait = () => (latencyMs ? new Promise((r) => setTimeout(r, latencyMs)) : Promise.resolve())

  async function run<T>(fn: () => T | Promise<T>): Promise<T> {
    await wait()
    try {
      return await fn()
    } catch (err) {
      if (err instanceof AppError) throw new ApiError(err.status, err.code, err.message, err.fields)
      throw err
    }
  }
  const uid = () => services.auth.authenticate(getToken())
  const authed = <T>(fn: (userId: number) => T | Promise<T>) => run(() => fn(uid()))

  return {
    mode: 'demo',
    signup: (i) => run(() => services.auth.signup(i)),
    login: (i) => run(() => services.auth.login(i)),
    me: () => authed((u) => services.auth.me(u)),
    updateProfile: (i) => authed((u) => services.auth.updateProfile(u, i)),
    deleteAccount: (i) =>
      authed(async (u) => {
        await services.auth.deleteAccount(u, i)
        for (const [t, id] of sessions) if (id === u) sessions.delete(t)
        persist()
      }),

    listProjects: () => authed((u) => services.projects.list(u)),
    getProject: (id) => authed((u) => services.projects.get(u, id)),
    createProject: (i) => authed((u) => services.projects.create(u, i)),
    updateProject: (id, p) => authed((u) => services.projects.update(u, id, p)),
    deleteProject: (id) => authed((u) => services.projects.remove(u, id)),

    listTasks: (q) => authed((u) => services.tasks.list(u, q ?? {})),
    getTask: (id) => authed((u) => services.tasks.get(u, id)),
    createTask: (i) => authed((u) => services.tasks.create(u, i)),
    updateTask: (id, p) => authed((u) => services.tasks.update(u, id, p)),
    moveTask: (id, i) => authed((u) => services.tasks.move(u, id, i)),
    deleteTask: (id) => authed((u) => services.tasks.remove(u, id)),

    listComments: (id) => authed((u) => services.comments.list(u, id)),
    addComment: (id, i) => authed((u) => services.comments.add(u, id, i)),
    deleteComment: (id) => authed((u) => services.comments.remove(u, id)),

    activity: (limit = 20) => authed((u) => services.activity.list(u, limit)),
    stats: (today) => authed((u) => services.stats(u, today)),
    seedSample: (today) => authed((u) => services.seedSample(u, today)),
  }
}
