import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
const KEY = 'covered:theme'

interface ThemeValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference(p: ThemePreference): void
}

const ThemeContext = createContext<ThemeValue | null>(null)
export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const v = localStorage.getItem(KEY)
      if (v === 'light' || v === 'dark' || v === 'system') return v
    } catch {
      /* ignore */
    }
    return 'system'
  })
  const [dark, setDark] = useState(systemDark)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const resolved = preference === 'system' ? (dark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#101216' : '#f5f3ee')
    try {
      localStorage.setItem(KEY, preference)
    } catch {
      /* ignore */
    }
  }, [resolved, preference])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
