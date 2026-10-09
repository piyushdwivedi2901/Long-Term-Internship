import { addDays, daysBetween, formatDate, formatMonths, formatRelative } from '../lib/dates.ts'
import { cx } from '../lib/cx.ts'
import { KIND_LABELS, type CoverageView } from '../../shared/warranty.ts'

interface Props {
  purchaseDate: string
  coverages: CoverageView[]
  today: string
  remindDays: number
}

const coverName = (c: CoverageView) => (c.kind === 'component' ? c.label : c.label && c.label !== KIND_LABELS[c.kind] ? c.label : `${KIND_LABELS[c.kind]} warranty`)

/**
 * Every cover drawn on one calendar, from the day it was bought, with a
 * "today" needle — so overlapping and back-to-back covers make sense at a
 * glance. Screen readers get the same facts as a list.
 */
const ORDER = { standard: 0, extended: 1, component: 2 } as const

export function CoverageTimeline({ purchaseDate, coverages: input, today, remindDays }: Props) {
  if (input.length === 0) return null
  // Main cover in the order it runs, then parts.
  const coverages = [...input].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.start.localeCompare(b.start))
  const lastEnd = coverages.reduce((a, c) => (c.end > a ? c.end : a), coverages[0].end)
  const from = purchaseDate
  // Leave a little room after the last end (or after today, if everything has ended).
  const to = addDays(lastEnd > today ? lastEnd : today, Math.max(20, Math.round(daysBetween(from, lastEnd > today ? lastEnd : today) * 0.04)))
  const span = Math.max(1, daysBetween(from, to))
  const pct = (day: string) => `${Math.min(100, Math.max(0, (daysBetween(from, day) / span) * 100))}%`
  const todayPct = pct(today)
  const todayInRange = today >= from && today <= to

  const startYear = Number(from.slice(0, 4)) + 1
  const endYear = Number(to.slice(0, 4))
  const step = endYear - startYear > 8 ? 2 : 1
  const years: number[] = []
  const gridYears: string[] = []
  for (let y = startYear; y <= endYear; y++) gridYears.push(pct(`${y}-01-01`))
  for (let y = startYear; y <= endYear; y += step) {
    // Keep clear of the "Bought …" label at the start and the right edge.
    const at = daysBetween(from, `${y}-01-01`) / span
    if (at > 0.22 && at < 0.97) years.push(y)
  }

  return (
    <figure className="timeline" aria-label="Warranty timeline">
      <ul className="sr-only">
        {coverages.map((c, i) => (
          <li key={i}>
            {coverName(c)}
            {c.provider ? ` from ${c.provider}` : ''}: {formatDate(c.start)} to {formatDate(c.end)},{' '}
            {c.state === 'expired' ? `ended ${formatRelative(c.daysLeft)}` : c.state === 'upcoming' ? `starts ${formatRelative(daysBetween(today, c.start))}` : `ends ${formatRelative(c.daysLeft)}`}.
          </li>
        ))}
      </ul>
      <div className="timeline__chart" aria-hidden>
        <div className="timeline__rows">
          <div className="timeline__grid">
            {gridYears.map((left) => (
              <span key={left} style={{ left }} />
            ))}
          </div>
          {coverages.map((c, i) => {
            const tone = c.state === 'expired' ? 'past' : c.kind === 'component' ? 'part' : c.state === 'active' && c.daysLeft <= remindDays ? 'soon' : 'main'
            return (
              <div className="timeline__row" key={i}>
                <div className="timeline__label">
                  <strong>{coverName(c)}</strong>
                  <span>{formatMonths(c.months)}{c.provider ? ` · ${c.provider}` : ''}</span>
                  <span className={`timeline__until is-${tone}`}>{c.state === 'expired' ? `Ended ${formatDate(c.end)}` : c.state === 'upcoming' ? `${formatDate(c.start)} – ${formatDate(c.end)}` : `Until ${formatDate(c.end)}`}</span>
                </div>
                <div className="timeline__track">
                  <div className={cx('timeline__bar', `is-${tone}`, c.state === 'upcoming' && 'is-upcoming')} style={{ left: pct(c.start), right: `calc(100% - ${pct(addDays(c.end, 1))})` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="timeline__axis">
          <span className="timeline__tick timeline__tick--start" style={{ left: 0 }}>Bought {formatDate(purchaseDate)}</span>
          {years.map((y) => {
            const left = pct(`${y}-01-01`)
            return (
              <span key={y} className="timeline__tick" style={{ left }}>
                {y}
              </span>
            )
          })}
        </div>
        {todayInRange && (
          <div className="timeline__today" style={{ left: `calc(var(--label-w) + (100% - var(--label-w)) * ${parseFloat(todayPct) / 100})` }}>
            <span>Today</span>
          </div>
        )}
      </div>
    </figure>
  )
}
