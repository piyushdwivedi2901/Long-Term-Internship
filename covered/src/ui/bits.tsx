import type { ReactNode } from 'react'
import { Armchair, Car, Laptop, Package, Refrigerator, Smartphone, Tv, WashingMachine, type LucideIcon } from 'lucide-react'
import { CATEGORY_LABELS, type Category } from '../../shared/schemas.ts'
import { STATUS_LABELS, type ItemStatus } from '../../shared/warranty.ts'
import { cx } from '../lib/cx.ts'

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  kitchen: Refrigerator,
  appliances: WashingMachine,
  tv: Tv,
  phones: Smartphone,
  computers: Laptop,
  furniture: Armchair,
  vehicles: Car,
  other: Package,
}

export function CategoryIcon({ category, size = 20, className }: { category: Category; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <span className={cx('cat', `cat--${category}`, className)} title={CATEGORY_LABELS[category]}>
      <Icon size={size} strokeWidth={1.75} aria-hidden />
    </span>
  )
}

/** Small status pill for lists. */
export function StatusPill({ status, children }: { status: ItemStatus; children?: ReactNode }) {
  return (
    <span className={`pill pill--${status}`}>
      <span className="pill__dot" aria-hidden />
      {children ?? STATUS_LABELS[status]}
    </span>
  )
}

/** The rubber stamp on an item's page — the one loud thing in the app. */
export function Stamp({ status, sub }: { status: ItemStatus; sub?: string }) {
  const word: Record<ItemStatus, string> = { covered: 'Covered', expiring: 'Ending soon', partial: 'Part covered', expired: 'Expired', none: 'No warranty' }
  return (
    <span className={`stamp stamp--${status}`}>
      <span className="stamp__word">{word[status]}</span>
      {sub && <span className="stamp__sub">{sub}</span>}
    </span>
  )
}

export function Empty({ title, children, action, icon }: { title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="empty__icon" aria-hidden>{icon}</span>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

/** A label/value pair with a one-tap copy button. */
export function Copyable({ label, value, onCopied }: { label: string; value: string; onCopied?: (label: string) => void }) {
  return (
    <div className="copyable">
      <dt>{label}</dt>
      <dd>
        <span className="mono">{value}</span>
        <button
          type="button"
          className="copy-btn"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => navigator.clipboard?.writeText(value).then(() => onCopied?.(label), () => {})}
        >
          Copy
        </button>
      </dd>
    </div>
  )
}
