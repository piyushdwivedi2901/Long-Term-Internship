import { createHttpApi } from './http'
import { createLocalApi } from './local'
import type { Api } from './types'

export * from './types'
export { createHttpApi } from './http'
export { createLocalApi } from './local'

let singleton: Api | undefined

/**
 * `VITE_API_URL` set  → real Express + SQLite server.
 * Not set (GitHub Pages) → in-browser demo mode with the same interface.
 */
export function getApi(): Api {
  if (!singleton) {
    const url = import.meta.env.VITE_API_URL as string | undefined
    singleton = url ? createHttpApi(url) : createLocalApi()
  }
  return singleton
}
