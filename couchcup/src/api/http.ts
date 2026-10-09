import type { ApiErrorBody, User } from '../../shared/types.ts'
import { ApiError, type ApiClient, type TokenGetter } from './types.ts'

/** Talks to the Express API in /server ('' base = same origin). */
export function createHttpClient(base: string, getToken: TokenGetter, fetchImpl: typeof fetch = (...a) => fetch(...a)): ApiClient {
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
      throw new ApiError(0, 'network', "Can't reach Couch Cup. Check your connection and try again.")
    }
    if (res.status === 204) return undefined as T
    const data = (await res.json().catch(() => null)) as T | ApiErrorBody | null
    if (!res.ok) {
      const e = (data as ApiErrorBody | null)?.error
      throw new ApiError(res.status, e?.code ?? 'http', e?.message ?? `Request failed (${res.status})`, e?.fields)
    }
    return data as T
  }
  const c = (id: number) => `/crews/${id}`
  return {
    mode: 'server',
    signup: (i) => call('POST', '/auth/signup', i),
    login: (i) => call('POST', '/auth/login', i),
    me: async () => (await call<{ user: User }>('GET', '/auth/me')).user,
    updateProfile: async (i) => (await call<{ user: User }>('PATCH', '/auth/me', i)).user,
    deleteAccount: (i) => call('DELETE', '/auth/me', i),

    overview: () => call('GET', '/overview'),
    seedSample: () => call('POST', '/sample', {}),

    getCrew: (id) => call('GET', c(id)),
    createCrew: (i) => call('POST', '/crews', i),
    renameCrew: (id, name) => call('PATCH', c(id), { name }),
    deleteCrew: (id) => call('DELETE', c(id)),
    regenerateInvite: (id) => call('POST', `${c(id)}/invite`),
    leaveCrew: (id) => call('POST', `${c(id)}/leave`),
    previewInvite: (code) => call('POST', '/invites/preview', { code }),
    joinCrew: (i) => call('POST', '/invites/join', i),
    crewActivity: (id) => call('GET', `${c(id)}/activity`),

    addPlayer: (id, i) => call('POST', `${c(id)}/players`, i),
    updatePlayer: (id, pid, i) => call('PATCH', `${c(id)}/players/${pid}`, i),
    removePlayer: (id, pid) => call('DELETE', `${c(id)}/players/${pid}`),
    playerProfile: (id, pid) => call('GET', `${c(id)}/players/${pid}`),

    createCompetition: (id, i) => call('POST', `${c(id)}/competitions`, i),
    getCompetition: (id) => call('GET', `/competitions/${id}`),
    renameCompetition: (id, name) => call('PATCH', `/competitions/${id}`, { name }),
    deleteCompetition: (id) => call('DELETE', `/competitions/${id}`),

    listMatches: (id) => call('GET', `${c(id)}/matches`),
    recordResult: (mid, i) => call('PUT', `/matches/${mid}/result`, i),
    clearResult: (mid) => call('DELETE', `/matches/${mid}/result`),
    addFriendly: (id, i) => call('POST', `${c(id)}/friendlies`, i),
  }
}
