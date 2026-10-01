import { ApiError, type Api, type AuthApi, type Session, type TokenGetter, type Todo, type TodosApi, type User } from './types'

type FetchLike = typeof fetch

async function request<T>(fetchImpl: FetchLike, url: string, init?: RequestInit): Promise<T> {
  const res = await fetchImpl(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

/** Talks to the Express + SQLite server in `server/`. */
export function createHttpApi(
  baseUrl: string,
  getToken: TokenGetter = () => null,
  fetchImpl: FetchLike = fetch,
): Api {
  const base = baseUrl.replace(/\/$/, '')
  const call = <T>(path: string, init?: RequestInit) => {
    const token = getToken()
    return request<T>(fetchImpl, `${base}${path}`, {
      ...init,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  }
  const post = <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) })

  const todos: TodosApi = {
    list: () => call<Todo[]>('/api/todos'),
    create: (text) => post<Todo>('/api/todos', { text }),
    update: (id, patch) => call<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => call<void>(`/api/todos/${id}`, { method: 'DELETE' }),
  }
  const auth: AuthApi = {
    signup: (email, password) => post<Session>('/api/auth/signup', { email, password }),
    login: (email, password) => post<Session>('/api/auth/login', { email, password }),
    me: async () => (await call<{ user: User }>('/api/auth/me')).user,
  }
  return { mode: 'server', todos, auth }
}
