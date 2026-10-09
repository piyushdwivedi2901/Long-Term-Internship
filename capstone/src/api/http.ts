import { ApiError, type ApiClient, type TokenGetter } from './types.ts'
import type { ApiErrorBody } from '../../shared/types.ts'

/** Talks to the Express API in /server. `base` is '' when served same-origin. */
export function createHttpClient(base: string, getToken: TokenGetter, fetchImpl: typeof fetch = fetch): ApiClient {
  const root = base.replace(/\/$/, '')

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = getToken()
    let res: Response
    try {
      res = await fetchImpl(`${root}/api${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError(0, 'network', "Can't reach the server. Check your connection and try again.")
    }
    if (res.status === 204) return undefined as T
    const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null
    if (!res.ok) {
      const err = (data as ApiErrorBody | null)?.error
      throw new ApiError(res.status, err?.code ?? 'http', err?.message ?? `Request failed (${res.status})`, err?.fields)
    }
    return data as T
  }

  const qs = (q: Record<string, unknown> = {}) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== null) p.set(k, String(v))
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return {
    mode: 'server',
    signup: (i) => call('POST', '/auth/signup', i),
    login: (i) => call('POST', '/auth/login', i),
    me: async () => (await call<{ user: Awaited<ReturnType<ApiClient['me']>> }>('GET', '/auth/me')).user,
    updateProfile: async (i) => (await call<{ user: Awaited<ReturnType<ApiClient['me']>> }>('PATCH', '/auth/me', i)).user,
    deleteAccount: (i) => call('DELETE', '/auth/me', i),

    listProjects: () => call('GET', '/projects'),
    getProject: (id) => call('GET', `/projects/${id}`),
    createProject: (i) => call('POST', '/projects', i),
    updateProject: (id, p) => call('PATCH', `/projects/${id}`, p),
    deleteProject: (id) => call('DELETE', `/projects/${id}`),

    listTasks: (q) => call('GET', `/tasks${qs(q)}`),
    getTask: (id) => call('GET', `/tasks/${id}`),
    createTask: (i) => call('POST', '/tasks', i),
    updateTask: (id, p) => call('PATCH', `/tasks/${id}`, p),
    moveTask: (id, i) => call('POST', `/tasks/${id}/move`, i),
    deleteTask: (id) => call('DELETE', `/tasks/${id}`),

    listComments: (id) => call('GET', `/tasks/${id}/comments`),
    addComment: (id, i) => call('POST', `/tasks/${id}/comments`, i),
    deleteComment: (id) => call('DELETE', `/comments/${id}`),

    activity: (limit = 20) => call('GET', `/activity${qs({ limit })}`),
    stats: (today) => call('GET', `/stats${qs({ today })}`),
    seedSample: (today) => call('POST', '/sample', { today }),
  }
}
