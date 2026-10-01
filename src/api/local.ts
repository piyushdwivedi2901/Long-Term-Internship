import {
  ApiError,
  type Api,
  type AuthApi,
  type Session,
  type TokenGetter,
  type Todo,
  type TodosApi,
  type User,
} from './types'

const KEY = 'lti:demo:db'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface StoredUser extends User {
  salt: string
  hash: string
}

interface Db {
  nextTodoId: number
  nextUserId: number
  users: StoredUser[]
  /** Todos keyed by owner: "anon" or the user id. */
  todos: Record<string, Todo[]>
}

const emptyDb = (): Db => ({ nextTodoId: 1, nextUserId: 1, users: [], todos: {} })

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

/**
 * Demo-mode backend for the static GitHub Pages site, where no server can
 * run. It implements the exact same interface as the HTTP client — including
 * accounts and per-user data — and persists to localStorage, so the UI code
 * is identical in both modes.
 *
 * NOT a security boundary: everything lives in the visitor's own browser.
 * Real authentication is the Express server's job.
 */
export function createLocalApi(
  getToken: TokenGetter = () => null,
  storage: Storage = window.localStorage,
): Api {
  const read = (): Db => {
    try {
      const raw = storage.getItem(KEY)
      if (raw) return JSON.parse(raw) as Db
    } catch {
      /* corrupt or unavailable storage: start fresh */
    }
    return emptyDb()
  }
  const write = (db: Db) => {
    try {
      storage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* quota / private mode: data just won't persist */
    }
  }

  const currentUserId = (db: Db): number | null => {
    const token = getToken()
    if (!token) return null
    const id = Number(token.replace(/^demo\./, ''))
    if (!db.users.some((u) => u.id === id)) throw new ApiError('invalid or expired token', 401)
    return id
  }
  const ownerKey = (db: Db) => String(currentUserId(db) ?? 'anon')
  const publicUser = ({ id, email }: StoredUser): User => ({ id, email })
  const session = (u: StoredUser): Session => ({ token: `demo.${u.id}`, user: publicUser(u) })

  const todos: TodosApi = {
    async list() {
      const db = read()
      return db.todos[ownerKey(db)] ?? []
    },
    async create(text) {
      const clean = text.trim()
      if (!clean) throw new ApiError('text is required', 400)
      if (clean.length > 200) throw new ApiError('text must be 200 characters or fewer', 400)
      const db = read()
      const key = ownerKey(db)
      const todo: Todo = { id: db.nextTodoId, text: clean, done: false }
      write({ ...db, nextTodoId: db.nextTodoId + 1, todos: { ...db.todos, [key]: [...(db.todos[key] ?? []), todo] } })
      return todo
    },
    async update(id, patch) {
      const db = read()
      const key = ownerKey(db)
      const existing = (db.todos[key] ?? []).find((t) => t.id === id)
      if (!existing) throw new ApiError('not found', 404)
      const updated = { ...existing, ...patch }
      write({ ...db, todos: { ...db.todos, [key]: db.todos[key].map((t) => (t.id === id ? updated : t)) } })
      return updated
    },
    async remove(id) {
      const db = read()
      const key = ownerKey(db)
      if (!(db.todos[key] ?? []).some((t) => t.id === id)) throw new ApiError('not found', 404)
      write({ ...db, todos: { ...db.todos, [key]: db.todos[key].filter((t) => t.id !== id) } })
    },
  }

  const auth: AuthApi = {
    async signup(rawEmail, password) {
      const email = rawEmail.trim().toLowerCase()
      if (!EMAIL_RE.test(email)) throw new ApiError('a valid email is required', 400)
      if (password.length < 8) throw new ApiError('password must be at least 8 characters', 400)
      const db = read()
      if (db.users.some((u) => u.email === email)) throw new ApiError('email already registered', 409)
      const salt = crypto.randomUUID()
      const user: StoredUser = { id: db.nextUserId, email, salt, hash: await hashPassword(password, salt) }
      write({ ...db, nextUserId: db.nextUserId + 1, users: [...db.users, user] })
      return session(user)
    },
    async login(rawEmail, password) {
      const email = rawEmail.trim().toLowerCase()
      const user = read().users.find((u) => u.email === email)
      const ok = user ? (await hashPassword(password, user.salt)) === user.hash : false
      if (!user || !ok) throw new ApiError('invalid email or password', 401)
      return session(user)
    },
    async me() {
      const db = read()
      const id = currentUserId(db)
      const user = db.users.find((u) => u.id === id)
      if (!user) throw new ApiError('authentication required', 401)
      return publicUser(user)
    },
  }

  return { mode: 'demo', todos, auth }
}
