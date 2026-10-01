import { useQuery } from '@tanstack/react-query'
import type { FetchStatus, UseFetchResult } from './useFetch'

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return (await res.json()) as T
}

/**
 * TanStack Query version of `useFetch` with the SAME return shape
 * (`{ data, status, error }`), so call sites migrate by renaming one import.
 *
 * What it adds over the hand-rolled hook, for free:
 *  - a cache keyed by URL (revisiting a screen shows data instantly)
 *  - request de-duplication across components
 *  - refetch on window focus / reconnect, retries, and request cancellation
 */
export function useJson<T = unknown>(url: string | null | undefined): UseFetchResult<T> {
  const query = useQuery<T, Error>({
    queryKey: ['json', url],
    queryFn: ({ signal }) => fetchJson<T>(url as string, signal),
    enabled: Boolean(url),
  })

  const status: FetchStatus = !url
    ? 'idle'
    : query.isPending
      ? 'loading'
      : query.isError
        ? 'error'
        : 'success'

  return { data: query.data ?? null, status, error: query.error ?? null }
}
