import { useEffect, useState } from 'react'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseFetchResult<T> {
  /** Parsed JSON body, or `null` until a request succeeds. */
  data: T | null
  status: FetchStatus
  /** The failure reason when `status === 'error'`, otherwise `null`. */
  error: Error | null
}

/**
 * Custom hook: useFetch
 * Encapsulates loading/error/data state for a GET request.
 *
 * Generic over the response shape — `useFetch<User[]>(url)` gives callers
 * a `data` typed as `User[] | null` instead of `any`. Passing a falsy url
 * skips the request (status stays `'idle'`). Stale responses are ignored
 * via a `cancelled` flag, so a slow earlier request can never overwrite a
 * newer one.
 */
export function useFetch<T = unknown>(url: string | null | undefined): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [status, setStatus] = useState<FetchStatus>(url ? 'loading' : 'idle')

  useEffect(() => {
    if (!url) {
      setStatus('idle')
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setStatus('loading')
    setData(null)
    setError(null)

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json() as Promise<T>
      })
      .then((json) => {
        if (cancelled) return
        setData(json)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return { data, status, error }
}
