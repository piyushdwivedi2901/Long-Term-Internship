import { useEffect, useState } from 'react'

/**
 * Custom hook: useLocalStorage
 * Behaves like useState, but persists the value to localStorage.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // localStorage unavailable (e.g. private mode) — fail silently
    }
  }, [key, value])

  return [value, setValue]
}
