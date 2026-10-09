import type { ReactNode } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Equal, Flame } from 'lucide-react'
import { PRIORITY_LABELS } from '../../shared/schemas.ts'
import type { Priority, ProjectColor } from '../../shared/types.ts'
import { describeDue } from '../lib/dates.ts'
import { cx } from '../lib/cx.ts'

/** Each project is a "line" with its own colour, like a route on a transit map. */
export function LineDot({ color, size = 10 }: { color: ProjectColor; size?: number }) {
  return <span className={`line-dot line--${color}`} style={{ width: size, height: size }} aria-hidden />
}

const PRIORITY_ICONS: Record<Priority, typeof ArrowDown> = { low: ArrowDown, medium: Equal, high: ArrowUp, urgent: Flame }

export function PriorityTag({ priority, compact }: { priority: Priority; compact?: boolean }) {
  const Icon = PRIORITY_ICONS[priority]
  return (
    <span className={`priority priority--${priority}`} title={compact ? `${PRIORITY_LABELS[priority]} priority` : undefined}>
      <Icon size={13} aria-hidden />
      {compact ? <span className="sr-only">{PRIORITY_LABELS[priority]} priority</span> : PRIORITY_LABELS[priority]}
    </span>
  )
}

export function DueChip({ due, today, done }: { due: string; today: string; done?: boolean }) {
  const { label, tone } = describeDue(due, today, done)
  return (
    <span className={`due due--${tone}`}>
      {tone === 'overdue' && <AlertTriangle size={12} aria-hidden />}
      <span className="sr-only">Due </span>
      {label}
    </span>
  )
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {initials || '?'}
    </span>
  )
}

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx('empty', className)}>
      <svg className="empty__art" viewBox="0 0 120 40" aria-hidden>
        <path d="M4 20 H116" className="empty__track" />
        {[16, 46, 76, 106].map((x, i) => (
          <circle key={x} cx={x} cy={20} r={i === 3 ? 6 : 4.5} className={i === 3 ? 'empty__stop empty__stop--end' : 'empty__stop'} />
        ))}
      </svg>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="label-chip">{children}</span>
}
