import { CATEGORY_LABELS } from '../../shared/schemas.ts'
import type { ItemSummary } from '../../shared/types.ts'
import { formatDate, formatRelative } from '../../shared/dates.ts'

/** People say "fridge" and "AC"; bills say "Refrigerator" and "Air Conditioner". */
const SYNONYMS: string[][] = [
  ['fridge', 'refrigerator', 'freezer'],
  ['ac', 'air conditioner', 'aircon', 'split', 'inverter'],
  ['tv', 'television', 'telly', 'bravia', 'smart tv'],
  ['phone', 'mobile', 'smartphone', 'cell', 'iphone', 'galaxy'],
  ['laptop', 'notebook', 'macbook', 'computer', 'pc'],
  ['washing machine', 'washer', 'front load', 'top load'],
  ['purifier', 'ro', 'water filter', 'aquaguard'],
  ['scooter', 'bike', 'two wheeler', 'ev'],
  ['sofa', 'couch', 'settee'],
  ['fan', 'ceiling fan', 'bldc'],
  ['microwave', 'oven', 'otg'],
]

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const contains = (hay: string, needle: string) => (needle.length <= 2 ? new RegExp(`\\b${needle}\\b`).test(hay) : hay.includes(needle))

function expand(term: string): string[] {
  const group = SYNONYMS.find((g) => g.some((w) => w === term || (term.length > 3 && w.startsWith(term))))
  return group ? [term, ...group] : [term]
}

const haystack = (i: ItemSummary) => ` ${norm([i.name, i.brand, i.model, i.room, i.store, i.serialNo, CATEGORY_LABELS[i.category]].join(' '))} `

/**
 * Every word must match something about the item (name, brand, model, room,
 * store, serial number or category), allowing everyday synonyms. Name
 * matches rank first.
 */
export function searchItems(items: ItemSummary[], query: string): ItemSummary[] {
  const terms = norm(query).split(' ').filter(Boolean)
  if (!terms.length) return []
  const scored: { item: ItemSummary; score: number }[] = []
  for (const item of items) {
    const hay = haystack(item)
    const name = ` ${norm(item.name)} `
    let score = 0
    let ok = true
    for (const term of terms) {
      const options = expand(term)
      if (!options.some((o) => contains(hay, norm(o)))) {
        ok = false
        break
      }
      score += options.some((o) => contains(name, norm(o))) ? 3 : 1
      if (name.startsWith(` ${term}`)) score += 2
    }
    if (ok) scored.push({ item, score })
  }
  return scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name)).map((s) => s.item)
}

/** The short "is it covered?" answer for a list row. */
export function quickAnswer(i: ItemSummary): { tone: 'yes' | 'soon' | 'part' | 'no'; headline: string; detail: string } {
  switch (i.status) {
    case 'covered':
      return { tone: 'yes', headline: `Yes — until ${formatDate(i.coveredUntil!)}`, detail: `${i.daysLeft} days of cover left` }
    case 'expiring':
      return { tone: 'soon', headline: i.daysLeft === 0 ? 'Yes — last day today' : `Yes — for ${i.daysLeft} more day${i.daysLeft === 1 ? '' : 's'}`, detail: `Ends ${formatDate(i.coveredUntil!)}. Report any fault now.` }
    case 'partial':
      return { tone: 'part', headline: 'Only some parts', detail: i.statusNote }
    case 'expired':
      return { tone: 'no', headline: `No — ended ${formatRelative(i.daysLeft ?? 0)}`, detail: i.statusNote }
    case 'none':
      return { tone: 'no', headline: 'No warranty recorded', detail: 'Add one from the bill or warranty card' }
  }
}
