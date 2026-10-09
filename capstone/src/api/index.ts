import { createDemoClient } from './demo.ts'
import { createHttpClient } from './http.ts'
import type { ApiClient, TokenGetter } from './types.ts'

export * from './types.ts'

/**
 * VITE_BACKEND=server → the Express API (VITE_API_URL, '' = same origin).
 * Otherwise (GitHub Pages) → the in-browser demo backend.
 */
export function createApiClient(getToken: TokenGetter): ApiClient {
  if (import.meta.env.VITE_BACKEND === 'server') {
    return createHttpClient((import.meta.env.VITE_API_URL as string | undefined) ?? '', getToken)
  }
  return createDemoClient(getToken)
}
