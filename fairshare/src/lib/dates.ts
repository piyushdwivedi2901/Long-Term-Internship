export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const utc = (day: string) => new Date(`${day}T00:00:00Z`)
const dayMonth = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const full = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthYear = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' })

export const formatDay = (day: string) => dayMonth.format(utc(day))
export const formatFullDay = (day: string) => full.format(utc(day))
export const formatMonth = (yyyyMm: string) => monthYear.format(utc(`${yyyyMm}-01`))
export const formatMonthShort = (yyyyMm: string) => monthShort.format(utc(`${yyyyMm}-01`))
export const dayOfMonth = (day: string) => Number(day.slice(8, 10))

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(secs)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(secs / 3600), 'hour')
  if (abs < 86_400 * 30) return rtf.format(Math.round(secs / 86_400), 'day')
  return formatDay(iso.slice(0, 10))
}
