import { createDemoClient } from './demo.ts'
import { createHttpClient } from './http.ts'
import type { ApiClient, TokenGetter } from './types.ts'

export * from './types.ts'

/** VITE_BACKEND=server → Express API; otherwise (GitHub Pages) → in-browser demo backend. */
export function createApiClient(getToken: TokenGetter): ApiClient {
  return import.meta.env.VITE_BACKEND === 'server'
    ? createHttpClient((import.meta.env.VITE_API_URL as string | undefined) ?? '', getToken)
    : createDemoClient(getToken)
}
