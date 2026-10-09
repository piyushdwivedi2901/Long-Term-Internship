import type { ApiErrorBody, User } from '../../shared/types.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

/** Talks to the Express API in /server ('' base = same origin). */
export function createHttpClient(base: string, getToken: TokenGetter, fetchImpl: typeof fetch = (...a) => fetch(...a)): ApiClient {
  const root = base.replace(/\/$/, '')

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
    const token = getToken()
    let res: Response
    try {
      res = await fetchImpl(`${root}/api${path}`, {
        method,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError(0, 'network', "Can't reach Covered. Check your connection and try again.")
    }
    if (!res.ok) {
      const e = ((await res.json().catch(() => null)) as ApiErrorBody | null)?.error
      throw new ApiError(res.status, e?.code ?? 'http', e?.message ?? `Request failed (${res.status})`, e?.fields)
    }
    return res
  }
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await send(method, path, body)
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }
  const q = (today: string) => `?today=${encodeURIComponent(today)}`

  return {
    mode: 'server',
    signup: (i) => call('POST', '/auth/signup', i),
    login: (i) => call('POST', '/auth/login', i),
    me: async () => (await call<{ user: User }>('GET', '/auth/me')).user,
    updateProfile: async (i) => (await call<{ user: User }>('PATCH', '/auth/me', i)).user,
    deleteAccount: (i) => call('DELETE', '/auth/me', i),

    dashboard: (today) => call('GET', `/dashboard${q(today)}`),
    listItems: (today) => call('GET', `/items${q(today)}`),
    getItem: (id, today) => call('GET', `/items/${id}${q(today)}`),
    createItem: (i, today) => call('POST', `/items${q(today)}`, i),
    updateItem: (id, i, today) => call('PATCH', `/items/${id}${q(today)}`, i),
    deleteItem: (id) => call('DELETE', `/items/${id}`),

    uploadFile: (itemId, i) => call('POST', `/items/${itemId}/files`, i),
    fileBlob: async (id) => (await send('GET', `/files/${id}`)).blob(),
    deleteFile: (id) => call('DELETE', `/files/${id}`),

    createClaim: (itemId, i, today) => call('POST', `/items/${itemId}/claims${q(today)}`, i),
    updateClaim: (id, i, today) => call('PATCH', `/claims/${id}${q(today)}`, i),
    deleteClaim: (id) => call('DELETE', `/claims/${id}`),

    exportAll: (today) => call('GET', `/export${q(today)}`),
    seedSample: (today) => call('POST', '/sample', { today }),
  }
}
