/**
 * Money is always an integer number of minor units (paise, cents). Floating
 * point never touches a stored amount, so ₹0.10 + ₹0.20 is exactly ₹0.30.
 */
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

export const CURRENCY_NAMES: Record<Currency, string> = {
  INR: 'Indian rupee',
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
}

const LOCALE: Record<Currency, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB' }
const formatters = new Map<string, Intl.NumberFormat>()

/** ₹1,23,456.70 for INR (Indian digit grouping), $1,234.56 for USD… */
export function formatMoney(minor: number, currency: Currency, { signed = false } = {}): string {
  const key = `${currency}${signed}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    formatters.set(key, f)
  }
  return f.format(minor / 100)
}

/**
 * Parses what a person types ("1,200", "₹ 99.5", "0.10") into minor units.
 * Returns null for anything that isn't a plain non-negative amount with at
 * most two decimals.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s,₹$€£]/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Minor units → an editable string ("1200.50"), for form inputs. */
export const toInputValue = (minor: number) => (minor / 100).toFixed(2).replace(/\.00$/, '')

/**
 * Splits `total` minor units proportionally to `weights` so the parts always
 * add up to exactly `total` (largest-remainder method). Ties go to the
 * earliest entry, so the result is deterministic.
 */
export function allocate(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('total must be a non-negative integer')
  const sum = weights.reduce((a, b) => a + b, 0)
  if (weights.length === 0 || sum <= 0 || weights.some((w) => w < 0)) throw new Error('weights must be non-negative with a positive sum')
  const raw = weights.map((w) => (total * w) / sum)
  const parts = raw.map(Math.floor)
  let left = total - parts.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    parts[i]++
    left--
  }
  return parts
}
