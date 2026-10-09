/** Calendar helpers. Due dates are plain YYYY-MM-DD strings in the user's local calendar. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

export const formatDay = (day: string) => monthDay.format(new Date(`${day}T00:00:00Z`))
export const formatLongToday = (now = new Date()) => longDate.format(now)

export type DueTone = 'overdue' | 'soon' | 'later' | 'done'

/** Human label + tone for a due date relative to today. */
export function describeDue(due: string, today: string, done = false): { label: string; tone: DueTone } {
  const diff = daysBetween(today, due)
  const tone: DueTone = done ? 'done' : diff < 0 ? 'overdue' : diff <= 2 ? 'soon' : 'later'
  let label: string
  if (diff === 0) label = 'Today'
  else if (diff === 1) label = 'Tomorrow'
  else if (diff === -1) label = 'Yesterday'
  else if (diff < 0) label = `${-diff} days late`
  else if (diff < 7) label = weekday.format(new Date(`${due}T00:00:00Z`))
  else label = formatDay(due)
  return { label, tone }
}

export type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'none'
export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'Next 7 days',
  later: 'Later',
  none: 'No due date',
}

export function dueBucket(due: string | null, today: string, done: boolean): DueBucket {
  if (!due) return 'none'
  const diff = daysBetween(today, due)
  if (diff < 0 && !done) return 'overdue'
  if (diff <= 0) return 'today'
  if (diff <= 7) return 'week'
  return 'later'
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(secs)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(secs / 3600), 'hour')
  if (abs < 86_400 * 30) return rtf.format(Math.round(secs / 86_400), 'day')
  return formatDay(iso.slice(0, 10))
}
