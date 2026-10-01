import { QueryClient } from '@tanstack/react-query'

/**
 * App-wide TanStack Query client.
 *  - staleTime 30s: revisiting a screen within 30s reuses the cache.
 *  - refetchOnWindowFocus: coming back to the tab revalidates stale data.
 *  - retry once, so a transient network blip doesn't flash an error.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    },
  })
}

export const queryClient = createQueryClient()
