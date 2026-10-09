import type { ApiErrorBody } from '../../shared/types.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

/** Talks to the Express API in /server ('' base = same origin). */
export function createHttpClient(base: string, getToken: TokenGetter, fetchImpl: typeof fetch = fetch): ApiClient {
  const root = base.replace(/\/$/, '')
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = getToken()
    let res: Response
    try {
      res = await fetchImpl(`${root}/api${path}`, {
        method,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    } catch {
      throw new ApiError(0, 'network', "Can't reach Fairshare. Check your connection and try again.")
    }
    if (res.status === 204) return undefined as T
    const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null
    if (!res.ok) {
      const e = (data as ApiErrorBody | null)?.error
      throw new ApiError(res.status, e?.code ?? 'http', e?.message ?? `Request failed (${res.status})`, e?.fields)
    }
    return data as T
  }
  const g = (id: number) => `/groups/${id}`
  return {
    mode: 'server',
    signup: (i) => call('POST', '/auth/signup', i),
    login: (i) => call('POST', '/auth/login', i),
    me: async () => (await call<{ user: Awaited<ReturnType<ApiClient['me']>> }>('GET', '/auth/me')).user,
    updateProfile: async (i) => (await call<{ user: Awaited<ReturnType<ApiClient['me']>> }>('PATCH', '/auth/me', i)).user,
    deleteAccount: (i) => call('DELETE', '/auth/me', i),
    overview: () => call('GET', '/overview'),
    seedSample: (today) => call('POST', '/sample', { today }),
    listGroups: () => call('GET', '/groups'),
    getGroup: (id) => call('GET', g(id)),
    createGroup: (i) => call('POST', '/groups', i),
    updateGroup: (id, p) => call('PATCH', g(id), p),
    deleteGroup: (id) => call('DELETE', g(id)),
    regenerateInvite: (id) => call('POST', `${g(id)}/invite`),
    leaveGroup: (id) => call('POST', `${g(id)}/leave`),
    previewInvite: (code) => call('POST', '/invites/preview', { code }),
    joinGroup: (i) => call('POST', '/invites/join', i),
    addMember: (id, name) => call('POST', `${g(id)}/members`, { name }),
    renameMember: (id, mid, name) => call('PATCH', `${g(id)}/members/${mid}`, { name }),
    removeMember: (id, mid) => call('DELETE', `${g(id)}/members/${mid}`),
    listExpenses: (id) => call('GET', `${g(id)}/expenses`),
    createExpense: (id, i) => call('POST', `${g(id)}/expenses`, i),
    updateExpense: (id, eid, i) => call('PATCH', `${g(id)}/expenses/${eid}`, i),
    deleteExpense: (id, eid) => call('DELETE', `${g(id)}/expenses/${eid}`),
    listSettlements: (id) => call('GET', `${g(id)}/settlements`),
    createSettlement: (id, i) => call('POST', `${g(id)}/settlements`, i),
    deleteSettlement: (id, sid) => call('DELETE', `${g(id)}/settlements/${sid}`),
    insights: (id, today) => call('GET', `${g(id)}/insights?today=${today}`),
    activity: (id) => call('GET', `${g(id)}/activity`),
  }
}
