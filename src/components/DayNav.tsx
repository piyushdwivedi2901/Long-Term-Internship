import {
  createContext,
  useContext,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Compound component: <DayNav> owns the selection state contract, and
 * <DayNav.Day> / <DayNav.Item> read it through a context that never leaves
 * this file. Consumers compose the markup; the parts stay in sync.
 */
interface DayNavContextValue {
  value: string
  onValueChange: (id: string) => void
}

const DayNavContext = createContext<DayNavContextValue | null>(null)

function useDayNav(component: string): DayNavContextValue {
  const ctx = useContext(DayNavContext)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <DayNav>`)
  }
  return ctx
}

interface DayNavProps {
  value: string
  onValueChange: (id: string) => void
  'aria-label'?: string
  children: ReactNode
}

function DayNavRoot({ value, onValueChange, children, ...rest }: DayNavProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-daynav-item]'),
    )
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLButtonElement)
    let next = current
    if (e.key === 'ArrowDown') next = (current + 1) % items.length
    if (e.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = items.length - 1
    e.preventDefault()
    items[next].focus()
  }

  return (
    <DayNavContext.Provider value={{ value, onValueChange }}>
      <nav
        className="commit-graph"
        aria-label={rest['aria-label'] ?? 'Tasks'}
        onKeyDown={handleKeyDown}
      >
        {children}
      </nav>
    </DayNavContext.Provider>
  )
}

interface DayProps {
  label: string
  /** Highlights the day's node on the commit graph. */
  active?: boolean
  children: ReactNode
}

function Day({ label, active = false, children }: DayProps) {
  useDayNav('DayNav.Day')
  const headingId = useId()
  return (
    <div
      className={`day-node ${active ? 'has-active' : ''}`}
      role="group"
      aria-labelledby={headingId}
    >
      <p className="day-label" id={headingId}>
        {label}
      </p>
      <ul>{children}</ul>
    </div>
  )
}

interface ItemProps {
  id: string
  num: number
  title: string
  /** Fired on hover / keyboard focus — lets the app warm the target's code. */
  onPrefetch?: () => void
}

function Item({ id, num, title, onPrefetch }: ItemProps) {
  const { value, onValueChange } = useDayNav('DayNav.Item')
  const selected = value === id
  return (
    <li>
      <button
        type="button"
        data-daynav-item
        className={`task-nav-btn ${selected ? 'active' : ''}`}
        aria-current={selected ? 'page' : undefined}
        onClick={() => onValueChange(id)}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
      >
        {String(num).padStart(2, '0')} · {title}
      </button>
    </li>
  )
}

export const DayNav = Object.assign(DayNavRoot, { Day, Item })
