import { Link } from 'react-router-dom'
import { Paperclip, Wrench } from 'lucide-react'
import type { ItemSummary } from '../../shared/types.ts'
import { formatInr } from '../../shared/money.ts'
import { daysBetween, formatMonthYear } from '../lib/dates.ts'
import { CategoryIcon, StatusPill } from '../ui/bits.tsx'

/** How much of the cover has been used up — a fuel gauge, not a progress bar. */
function Gauge({ item, today }: { item: ItemSummary; today: string }) {
  if (item.status === 'none') return <div className="gauge gauge--none" aria-hidden />
  if (item.status === 'expired' || !item.coveredUntil) return <div className="gauge gauge--expired" aria-hidden><span style={{ width: '100%' }} /></div>
  const total = Math.max(1, daysBetween(item.purchaseDate, item.coveredUntil))
  const used = Math.min(1, Math.max(0, daysBetween(item.purchaseDate, today) / total))
  return (
    <div className={`gauge gauge--${item.status}`} aria-hidden>
      <span style={{ width: `${Math.max(2, used * 100)}%` }} />
    </div>
  )
}

export function ItemCard({ item, today }: { item: ItemSummary; today: string }) {
  return (
    <li className="item-card">
      <Link to={`/items/${item.id}`} className="item-card__link">
        <div className="item-card__top">
          <CategoryIcon category={item.category} />
          <StatusPill status={item.status} />
        </div>
        <h2 className="item-card__name">{item.name}</h2>
        <p className="item-card__model">{[item.brand, item.model].filter(Boolean).join(' · ') || ' '}</p>
        <Gauge item={item} today={today} />
        <p className="item-card__note">{item.statusNote}</p>
        <div className="item-card__foot">
          <span className="mono">{item.price !== null ? formatInr(item.price) : '—'}</span>
          <span className="muted item-card__date"><span className="sr-only">Bought </span>{formatMonthYear(item.purchaseDate)}</span>
          <span className="item-card__icons">
            {item.openClaims > 0 && (
              <span className="flag flag--repair" title="Repair in progress">
                <Wrench size={14} aria-hidden />
                <span className="sr-only">Repair in progress</span>
              </span>
            )}
            {item.fileCount > 0 ? (
              <span className="flag" title={`${item.fileCount} file${item.fileCount === 1 ? '' : 's'} saved`}>
                <Paperclip size={14} aria-hidden />
                {item.fileCount}
                <span className="sr-only"> file{item.fileCount === 1 ? '' : 's'} saved</span>
              </span>
            ) : (
              <span className="flag flag--missing" title="No bill saved">No bill</span>
            )}
          </span>
        </div>
      </Link>
    </li>
  )
}
