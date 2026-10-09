/**
 * Calendar maths on plain "YYYY-MM-DD" days. Warranties are about dates, not
 * instants, so everything here works in UTC to stay free of time-zone and
 * daylight-saving surprises.
 */
const DAY_MS = 86_400_000
const utc = (day: string) => new Date(`${day}T00:00:00Z`)
export const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(day: string, n: number): string {
  const d = utc(day)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDay(d)
}

/**
 * Adds calendar months, clamping to the end of a shorter month the way
 * warranty cards do: 31 Jan + 1 month = 28/29 Feb, never 2/3 March.
 */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return isoDay(target)
}

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: string, b: string) => Math.round((utc(b).getTime() - utc(a).getTime()) / DAY_MS)

const fmtLong = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const fmtMonthYear = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })
/** "14 Mar 2027" */
export const formatDate = (day: string) => fmtLong.format(utc(day))
/** "Mar 2027" */
export const formatMonthYear = (day: string) => fmtMonthYear.format(utc(day))

/** "1 year", "18 months", "5 years" */
export function formatMonths(months: number): string {
  if (months % 12 === 0) {
    const y = months / 12
    return `${y} year${y === 1 ? '' : 's'}`
  }
  return `${months} month${months === 1 ? '' : 's'}`
}

/** "today", "tomorrow", "in 12 days", "in 3 months", "in 2 years" — and the past equivalents. */
export function formatRelative(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  const abs = Math.abs(days)
  const span = abs < 60 ? `${abs} days` : abs < 730 ? `${Math.round(abs / 30.44)} months` : `${Math.round(abs / 365.25)} years`
  return days > 0 ? `in ${span}` : `${span} ago`
}

/**
 * Trust the browser's idea of "today" (the user's local date) when it is
 * within a day of the server's UTC date; otherwise fall back to UTC. Late
 * evening in India is already "tomorrow" there, and this keeps day counts
 * matching what the user sees on their wall calendar.
 */
export function resolveToday(input: unknown, now: Date): string {
  const server = isoDay(now)
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(utc(input).getTime())) {
    if (isoDay(utc(input)) === input && Math.abs(daysBetween(server, input)) <= 1) return input
  }
  return server
}
