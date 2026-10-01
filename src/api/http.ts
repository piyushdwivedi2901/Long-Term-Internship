import { ApiError, type Api, type Todo, type TodosApi } from './types'

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
export function createHttpApi(baseUrl: string, fetchImpl: FetchLike = fetch): Api {
  const base = baseUrl.replace(/\/$/, '')
  const todos: TodosApi = {
    list: () => request<Todo[]>(fetchImpl, `${base}/api/todos`),
    create: (text) =>
      request<Todo>(fetchImpl, `${base}/api/todos`, { method: 'POST', body: JSON.stringify({ text }) }),
    update: (id, patch) =>
      request<Todo>(fetchImpl, `${base}/api/todos/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id) => request<void>(fetchImpl, `${base}/api/todos/${id}`, { method: 'DELETE' }),
  }
  return { mode: 'server', todos }
}
