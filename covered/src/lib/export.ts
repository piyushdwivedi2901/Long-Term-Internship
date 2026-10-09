import { formatMonths } from '../../shared/dates.ts'
import { buildIcs, type IcsItem } from '../../shared/ics.ts'
import { CATEGORY_LABELS } from '../../shared/schemas.ts'
import type { Backup, ItemDetail } from '../../shared/types.ts'
import { KIND_LABELS, STATUS_LABELS } from '../../shared/warranty.ts'

const cell = (v: string | number) => {
  const s = String(v)
  // Quote when needed, and neutralise spreadsheet formula injection (=, +, -, @).
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const describeCovers = (item: Pick<ItemDetail, 'coverages'>) =>
  item.coverages.map((c) => `${c.kind === 'component' ? c.label : KIND_LABELS[c.kind]} ${formatMonths(c.months)}${c.provider ? ` (${c.provider})` : ''}: ${c.start} to ${c.end}`).join('; ')

/** One row per item — opens cleanly in Excel or Google Sheets. */
export function itemsToCsv(items: ItemDetail[]): string {
  const rows: (string | number)[][] = [
    ['Item', 'Brand', 'Model', 'Category', 'Room', 'Purchase date', 'Price (INR)', 'Store', 'Invoice no.', 'Serial no.', 'Status', 'Covered until', 'Covers', 'Service phone', 'Service email', 'Service website', 'Repairs', 'Files'],
    ...items.map((i) => [
      i.name,
      i.brand,
      i.model,
      CATEGORY_LABELS[i.category],
      i.room,
      i.purchaseDate,
      i.price === null ? '' : (i.price / 100).toFixed(2),
      i.store,
      i.invoiceNo,
      i.serialNo,
      STATUS_LABELS[i.status],
      i.coveredUntil ?? '',
      describeCovers(i),
      i.support.phone,
      i.support.email,
      i.support.website,
      i.claims.length,
      i.files.length,
    ]),
  ]
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export const toIcsItems = (items: ItemDetail[]): IcsItem[] => items

export function calendarFile(items: ItemDetail[], remindDays: number): string {
  return buildIcs(toIcsItems(items), { remindDays, stamp: new Date() })
}

export function download(filename: string, content: string | Blob, type = 'text/plain;charset=utf-8') {
  // CSV gets a BOM so Excel reads ₹ and other non-ASCII text correctly.
  const blob = content instanceof Blob ? content : new Blob(type.startsWith('text/csv') ? ['﻿', content] : [content], { type })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const backupJson = (b: Backup) => JSON.stringify(b, null, 2)
