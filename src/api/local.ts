import { ApiError, type Api, type Todo, type TodosApi } from './types'

const KEY = 'lti:demo:todos'

interface Stored {
  nextId: number
  todos: Todo[]
}

/**
 * Demo-mode backend for the static GitHub Pages site, where no server can
 * run. It implements the exact same interface as the HTTP client and persists
 * to localStorage, so the UI code is identical in both modes.
 */
export function createLocalApi(storage: Storage = window.localStorage): Api {
  const read = (): Stored => {
    try {
      const raw = storage.getItem(KEY)
      if (raw) return JSON.parse(raw) as Stored
    } catch {
      /* corrupt or unavailable storage: start fresh */
    }
    return { nextId: 1, todos: [] }
  }
  const write = (s: Stored) => {
    try {
      storage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* quota / private mode: data just won't persist */
    }
  }

  const todos: TodosApi = {
    async list() {
      return read().todos
    },
    async create(text) {
      const clean = text.trim()
      if (!clean) throw new ApiError('text is required', 400)
      const s = read()
      const todo: Todo = { id: s.nextId, text: clean, done: false }
      write({ nextId: s.nextId + 1, todos: [...s.todos, todo] })
      return todo
    },
    async update(id, patch) {
      const s = read()
      const existing = s.todos.find((t) => t.id === id)
      if (!existing) throw new ApiError('not found', 404)
      const updated = { ...existing, ...patch }
      write({ ...s, todos: s.todos.map((t) => (t.id === id ? updated : t)) })
      return updated
    },
    async remove(id) {
      const s = read()
      if (!s.todos.some((t) => t.id === id)) throw new ApiError('not found', 404)
      write({ ...s, todos: s.todos.filter((t) => t.id !== id) })
    },
  }
  return { mode: 'demo', todos }
}
