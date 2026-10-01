import { createHttpApi } from './http'
import { createLocalApi } from './local'
import type { Api, TokenGetter } from './types'

export * from './types'
export { createHttpApi } from './http'
export { createLocalApi } from './local'

/**
 * `VITE_API_URL` set  → real Express + SQLite server.
 * Not set (GitHub Pages) → in-browser demo mode with the same interface.
 */
export function createApi(getToken: TokenGetter = () => null): Api {
  const url = import.meta.env.VITE_API_URL as string | undefined
  return url ? createHttpApi(url, getToken) : createLocalApi(getToken)
}

let anonymous: Api | undefined
/** App-wide anonymous client (no signed-in user), used by Task 35. */
export function getApi(): Api {
  return (anonymous ??= createApi())
}
