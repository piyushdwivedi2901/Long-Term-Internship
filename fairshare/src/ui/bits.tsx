import type { ReactNode } from 'react'
import {
  BusFront,
  Clapperboard,
  HeartPulse,
  House,
  Lightbulb,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  BedDouble,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_LABELS, type Category } from '../../shared/schemas.ts'
import { formatMoney, type Currency } from '../../shared/money.ts'
import { cx } from '../lib/cx.ts'

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  food: UtensilsCrossed,
  groceries: ShoppingBasket,
  travel: BusFront,
  stay: BedDouble,
  rent: House,
  utilities: Lightbulb,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  health: HeartPulse,
  other: Receipt,
}

export function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <span className={`cat cat--${category}`} title={CATEGORY_LABELS[category]}>
      <Icon size={size} aria-hidden />
    </span>
  )
}

/** Avatar with a stable colour derived from the name. */
export function Avatar({ name, size = 32, you }: { name: string; size?: number; you?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span className={cx('avatar', you && 'avatar--you')} style={{ width: size, height: size, fontSize: size * 0.38, ['--hue' as string]: h }} aria-hidden>
      {initials}
    </span>
  )
}

/** Signed money with colour: green when you're owed, orange when you owe. */
export function Amount({ value, currency, className, plain }: { value: number; currency: Currency; className?: string; plain?: boolean }) {
  const tone = value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero'
  return <span className={cx('amount', !plain && `amount--${tone}`, className)}>{formatMoney(Math.abs(value), currency)}</span>
}

/** "you're owed ₹500" / "you owe ₹500" / "settled up" */
export function BalanceLine({ value, currency, subject = 'you' }: { value: number; currency: Currency; subject?: string }) {
  if (value === 0) return <span className="balance-line amount--zero">{subject === 'you' ? "You're settled up" : `${subject} is settled up`}</span>
  const you = subject === 'you'
  return (
    <span className="balance-line">
      {value > 0 ? (you ? "You're owed " : `${subject} is owed `) : you ? 'You owe ' : `${subject} owes `}
      <Amount value={value} currency={currency} />
    </span>
  )
}

export function Empty({ title, children, action, art = '🧾' }: { title: string; children?: ReactNode; action?: ReactNode; art?: string }) {
  return (
    <div className="empty">
      <span className="empty__art" aria-hidden>{art}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
