import { useEffect, useState } from 'react'

/**
 * Custom hook: useFetch
 * Encapsulates loading/error/data state for a GET request.
 */
export function useFetch(url) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(url ? 'loading' : 'idle')

  useEffect(() => {
    if (!url) {
      setStatus('idle')
      setData(null)
      return
    }

    let cancelled = false
    setStatus('loading')
    setData(null)

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return { data, status }
}
