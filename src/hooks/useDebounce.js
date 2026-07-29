import { useEffect, useState } from 'react'

/**
 * Custom hook: useDebounce
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of no further changes — useful for search inputs that shouldn't fire
 * a request on every keystroke.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
