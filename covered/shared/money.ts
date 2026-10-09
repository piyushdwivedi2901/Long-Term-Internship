/**
 * Prices are stored as whole paise, so arithmetic never meets floating point.
 */
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
const inrRounded = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** ₹1,23,456 or ₹1,23,456.5 (Indian digit grouping, paise only when present). */
export const formatInr = (paise: number) => inr.format(paise / 100)
/** ₹1,23,457 — for totals and dashboards. */
export const formatInrRounded = (paise: number) => inrRounded.format(Math.round(paise / 100))

/** "₹1.2 L", "₹3.4 Cr" — compact Indian notation for tight spaces. */
export function formatInrCompact(paise: number): string {
  const rupees = paise / 100
  if (rupees >= 1e7) return `₹${trim(rupees / 1e7)} Cr`
  if (rupees >= 1e5) return `₹${trim(rupees / 1e5)} L`
  if (rupees >= 1e3) return `₹${trim(rupees / 1e3)}k`
  return formatInrRounded(paise)
}
const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''))

/**
 * Parses what a person types ("54,990", "₹ 1,23,000.50") into paise.
 * Returns null for anything that isn't a plain non-negative amount with at
 * most two decimals.
 */
export function parseInr(input: string): number | null {
  const cleaned = input.replace(/[\s,₹]|rs\.?/gi, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(paise) ? paise : null
}

/** Paise → an editable string ("54990" / "54990.50"). */
export const toInputValue = (paise: number) => (paise / 100).toFixed(2).replace(/\.00$/, '')
