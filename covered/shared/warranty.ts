import { addDays, addMonths, daysBetween, formatDate, formatRelative } from './dates.ts'
import type { Coverage, CoverageKind } from './schemas.ts'

export type CoverageState = 'upcoming' | 'active' | 'expired'
export interface CoverageView extends Coverage {
  /** first covered day */
  start: string
  /** last covered day (inclusive) */
  end: string
  state: CoverageState
  /** days from today to `end`; negative once it has ended */
  daysLeft: number
}

/**
 * - covered:  the main (standard / extended) warranty is running
 * - expiring: it is running but ends within the reminder window
 * - partial:  the main warranty is over but a part (compressor, panel…) is still covered
 * - expired:  nothing is covered any more
 * - none:     no warranty was recorded
 */
export type ItemStatus = 'covered' | 'expiring' | 'partial' | 'expired' | 'none'
export const STATUS_LABELS: Record<ItemStatus, string> = {
  covered: 'Covered',
  expiring: 'Expiring soon',
  partial: 'Parts covered',
  expired: 'Expired',
  none: 'No warranty',
}
export const KIND_LABELS: Record<CoverageKind, string> = { standard: 'Standard', extended: 'Extended', component: 'Part' }

/**
 * A cover of N months bought on D runs to the day before D + N months:
 * bought 15 Mar 2025 with 1 year → covered through 14 Mar 2026.
 */
export const coverageEnd = (start: string, months: number) => addDays(addMonths(start, months), -1)

/**
 * Lays each cover out on the calendar. Standard and part covers start on the
 * purchase date; an extended warranty starts the day after the standard one
 * ends (or on the purchase date if there is no standard warranty).
 */
export function layoutCoverages(purchaseDate: string, coverages: Coverage[], today: string): CoverageView[] {
  const standard = coverages.find((c) => c.kind === 'standard')
  const standardEnd = standard ? coverageEnd(purchaseDate, standard.months) : null
  return coverages.map((c) => {
    const start = c.kind === 'extended' && standardEnd ? addDays(standardEnd, 1) : purchaseDate
    const end = coverageEnd(start, c.months)
    const state: CoverageState = today < start ? 'upcoming' : today > end ? 'expired' : 'active'
    return { ...c, start, end, state, daysLeft: daysBetween(today, end) }
  })
}

export interface StatusResult {
  status: ItemStatus
  /** the date cover runs out (main cover if running, else the longest running part) */
  coveredUntil: string | null
  daysLeft: number | null
  /** a short line like "Until 14 Mar 2027" or "Compressor until Jun 2030" */
  note: string
}

export function itemStatus(views: CoverageView[], today: string, remindDays: number): StatusResult {
  if (views.length === 0) return { status: 'none', coveredUntil: null, daysLeft: null, note: 'No warranty recorded' }
  const main = views.filter((v) => v.kind !== 'component')
  // Standard + extended run back to back, so main cover lasts until the later end.
  const mainLive = main.filter((v) => v.state !== 'expired')
  if (mainLive.length) {
    const end = mainLive.reduce((a, v) => (v.end > a ? v.end : a), mainLive[0].end)
    const daysLeft = daysBetween(today, end)
    return {
      status: daysLeft <= remindDays ? 'expiring' : 'covered',
      coveredUntil: end,
      daysLeft,
      note: daysLeft <= remindDays ? `Ends ${formatRelative(daysLeft)}` : `Until ${formatDate(end)}`,
    }
  }
  const parts = views.filter((v) => v.kind === 'component' && v.state === 'active').sort((a, b) => b.end.localeCompare(a.end))
  if (parts.length) {
    return {
      status: 'partial',
      coveredUntil: parts[0].end,
      daysLeft: parts[0].daysLeft,
      note: `${parts.map((p) => p.label).join(', ')} until ${formatDate(parts[0].end)}`,
    }
  }
  const lastEnd = views.reduce((a, v) => (v.end > a ? v.end : a), views[0].end)
  return { status: 'expired', coveredUntil: null, daysLeft: daysBetween(today, lastEnd), note: `Ended ${formatDate(lastEnd)}` }
}

/**
 * The covers whose end is worth a reminder. A standard warranty followed by
 * an extended one doesn't really "end" — cover just continues — so only the
 * extended end is reported.
 */
export function meaningfulEnds(views: CoverageView[]): CoverageView[] {
  const hasExtended = views.some((v) => v.kind === 'extended')
  return views.filter((v) => !(v.kind === 'standard' && hasExtended))
}

export interface CoverageAnswer {
  tone: 'yes' | 'soon' | 'part' | 'no'
  headline: string
  detail: string
}

/** The plain-language answer to "is it still covered?" */
export function coverageAnswer(views: CoverageView[], today: string, remindDays: number): CoverageAnswer {
  const s = itemStatus(views, today, remindDays)
  const live = views.filter((v) => v.state === 'active')
  const main = live.filter((v) => v.kind !== 'component').sort((a, b) => b.end.localeCompare(a.end))[0]
  const providerOf = (v: CoverageView) => (v.provider ? ` from ${v.provider}` : '')
  switch (s.status) {
    case 'covered':
    case 'expiring': {
      const parts = live.filter((v) => v.kind === 'component' && v.end > s.coveredUntil!)
      const extra = parts.length ? ` The ${parts.map((p) => p.label.toLowerCase()).join(' and ')} is covered longer, until ${formatDate(parts[0].end)}.` : ''
      const which = main ? `${KIND_LABELS[main.kind].toLowerCase()} warranty${providerOf(main)}` : 'warranty'
      // Standard now, extended to follow: describe the hand-over, not just today's cover.
      const next = views.find((v) => v.kind === 'extended' && v.state === 'upcoming')
      const chain =
        main && next
          ? `${s.daysLeft} days left: the ${which} runs until ${formatDate(main.end)}, then the extended warranty${providerOf(next)} takes over.`
          : `${s.daysLeft} days left on the ${which}.`
      return s.status === 'covered'
        ? { tone: 'yes', headline: `Yes — covered until ${formatDate(s.coveredUntil!)}`, detail: `${chain}${extra}` }
        : {
            tone: 'soon',
            headline: s.daysLeft === 0 ? 'Yes — but today is the last day' : `Yes — but only for ${s.daysLeft} more day${s.daysLeft === 1 ? '' : 's'}`,
            detail: `The ${which} ends on ${formatDate(s.coveredUntil!)}. If anything is wrong, raise it now.${extra}`,
          }
    }
    case 'partial': {
      const mainEnd = views.filter((v) => v.kind !== 'component').sort((a, b) => b.end.localeCompare(a.end))[0]
      const names = live.filter((v) => v.kind === 'component').map((v) => v.label)
      return {
        tone: 'part',
        headline: `Only the ${names.join(' and ').toLowerCase()} ${names.length > 1 ? 'are' : 'is'} still covered`,
        detail: `${mainEnd ? `The main warranty ended on ${formatDate(mainEnd.end)}. ` : ''}${names.join(' and ')} cover runs until ${formatDate(s.coveredUntil!)}.`,
      }
    }
    case 'expired':
      return { tone: 'no', headline: `No — the warranty ended ${formatRelative(s.daysLeft!)}`, detail: `${s.note}. Repairs will be chargeable, though some brands offer paid service plans.` }
    case 'none':
      return { tone: 'no', headline: 'No warranty recorded', detail: 'Add the warranty from the bill or the warranty card to track it.' }
  }
}
