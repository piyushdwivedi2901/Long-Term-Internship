import { addDays, formatDate } from './dates.ts'
import { KIND_LABELS, meaningfulEnds, type CoverageView } from './warranty.ts'

export interface IcsItem {
  id: number
  name: string
  brand: string
  model: string
  serialNo: string
  invoiceNo: string
  store: string
  purchaseDate: string
  support: { phone: string; email: string; website: string }
  coverages: CoverageView[]
}

/** RFC 5545 text escaping. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Folds a content line at 75 octets (not characters), never splitting a UTF-8 sequence. */
export function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

const compact = (day: string) => day.replaceAll('-', '')

/**
 * A calendar file with one all-day event on the last covered day of every
 * cover that hasn't ended yet, each with an alarm `remindDays` before. Opens
 * in Google Calendar, Apple Calendar and Outlook.
 */
export function buildIcs(items: IcsItem[], { remindDays, stamp }: { remindDays: number; stamp: Date }): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Covered//Warranty reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Warranty reminders']
  for (const item of items) {
    for (const [i, c] of meaningfulEnds(item.coverages).entries()) {
      if (c.state === 'expired') continue
      const what = c.kind === 'component' ? `${c.label} cover` : `${KIND_LABELS[c.kind]} warranty`
      const details = [
        `${what}${c.provider ? ` (${c.provider})` : ''} for ${item.name} ends on ${formatDate(c.end)}.`,
        [item.brand, item.model].filter(Boolean).join(' ') && `Model: ${[item.brand, item.model].filter(Boolean).join(' ')}`,
        item.serialNo && `Serial: ${item.serialNo}`,
        `Bought: ${formatDate(item.purchaseDate)}${item.store ? ` at ${item.store}` : ''}${item.invoiceNo ? `, invoice ${item.invoiceNo}` : ''}`,
        item.support.phone && `Service: ${item.support.phone}`,
        item.support.website && `Support: ${item.support.website}`,
        'Check it over now and report any fault before the cover ends.',
      ].filter(Boolean)
      lines.push(
        'BEGIN:VEVENT',
        `UID:covered-${item.id}-${c.kind}-${i}@covered.app`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${compact(c.end)}`,
        `DTEND;VALUE=DATE:${compact(addDays(c.end, 1))}`,
        `SUMMARY:${esc(`Last day: ${what} — ${item.name}`)}`,
        `DESCRIPTION:${esc(details.join('\n'))}`,
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(`${item.name}: ${what} ends in ${remindDays} days`)}`,
        `TRIGGER:-P${remindDays}D`,
        'END:VALARM',
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
