const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })
const dayYear = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

/** "9 Oct" this year, "9 Oct 2025" otherwise — in the user's time zone. */
export function formatDay(iso: string, now = new Date()): string {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() ? day.format(d) : dayYear.format(d)
}
export const formatDayTime = (iso: string) => `${formatDay(iso)}, ${time.format(new Date(iso))}`

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function timeAgo(iso: string, now = Date.now()): string {
  const secs = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(secs)
  if (abs < 45) return 'just now'
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(secs / 3600), 'hour')
  if (abs < 86_400 * 14) return rtf.format(Math.round(secs / 86_400), 'day')
  return formatDay(iso)
}

/** ISO → the value a datetime-local input wants (local time, no seconds). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
/** datetime-local value → ISO with the user's offset applied. */
export const fromLocalInput = (value: string) => new Date(value).toISOString()

export function greeting(now = new Date()): string {
  const h = now.getHours()
  return h < 5 ? 'Late night session' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
