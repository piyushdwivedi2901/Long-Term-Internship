export { formatDate, formatMonthYear, formatMonths, formatRelative, daysBetween, addDays } from '../../shared/dates.ts'

/** Today on the user's own calendar (not UTC). */
export function localToday(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function greeting(now = new Date()): string {
  const h = now.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
