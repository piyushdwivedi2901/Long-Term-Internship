import { useRef, type KeyboardEvent, type ReactNode } from 'react'

export interface TabDef {
  id: string
  label: ReactNode
  /** accessible name if label isn't plain text */
  name?: string
}

/** WAI-ARIA tabs with arrow / Home / End keys and automatic activation. */
export function Tabs({ tabs, active, onChange, label, idPrefix }: { tabs: TabDef[]; active: string; onChange(id: string): void; label: string; idPrefix: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to < 0) return
    e.preventDefault()
    refs.current[to]?.focus()
    onChange(tabs[to].id)
  }
  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => void (refs.current[i] = el)}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.id}`}
          aria-controls={`${idPrefix}-panel-${t.id}`}
          aria-selected={active === t.id}
          aria-label={t.name}
          tabIndex={active === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ id, idPrefix, children }: { id: string; idPrefix: string; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} tabIndex={0} className="panel">
      {children}
    </div>
  )
}
