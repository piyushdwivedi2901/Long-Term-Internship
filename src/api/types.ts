export interface Todo {
  id: number
  text: string
  done: boolean
}

export interface TodosApi {
  list(): Promise<Todo[]>
  create(text: string): Promise<Todo>
  update(id: number, patch: Partial<Pick<Todo, 'text' | 'done'>>): Promise<Todo>
  remove(id: number): Promise<void>
}

export interface User {
  id: number
  email: string
}

export interface Session {
  token: string
  user: User
}

export interface AuthApi {
  signup(email: string, password: string): Promise<Session>
  login(email: string, password: string): Promise<Session>
  /** Validates a stored token and returns its user (rejects with 401 if stale). */
  me(): Promise<User>
}

export interface Api {
  /** 'server' = Express + SQLite over HTTP; 'demo' = in-browser (localStorage). */
  mode: 'server' | 'demo'
  todos: TodosApi
  auth: AuthApi
}

/** Returns the current auth token, or null when signed out. */
export type TokenGetter = () => string | null

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
