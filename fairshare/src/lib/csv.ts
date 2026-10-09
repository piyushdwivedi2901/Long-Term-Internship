import { CATEGORY_LABELS } from '../../shared/schemas.ts'
import type { Expense, GroupDetail, Settlement } from '../../shared/types.ts'

const cell = (v: string | number) => {
  const s = String(v)
  // Quote when needed, and neutralise spreadsheet formula injection (=, +, -, @).
  const safe = /^[=+\-@]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
const decimal = (minor: number) => (minor / 100).toFixed(2)

/** Spreadsheet-friendly export: one row per expense with each person's share, then payments. */
export function groupToCsv(group: GroupDetail, expenses: Expense[], settlements: Settlement[]): string {
  const name = (id: number) => group.members.find((m) => m.id === id)?.name ?? 'Unknown'
  const rows: (string | number)[][] = [
    ['Date', 'Description', 'Category', `Amount (${group.currency})`, 'Paid by', ...group.members.map((m) => `${m.name}'s share`)],
    ...[...expenses]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
      .map((e) => [
        e.date,
        e.description,
        CATEGORY_LABELS[e.category],
        decimal(e.amount),
        name(e.paidBy),
        ...group.members.map((m) => decimal(e.shares.find((s) => s.memberId === m.id)?.amount ?? 0)),
      ]),
    [],
    ['Date', 'Payment', 'From', 'To', `Amount (${group.currency})`, 'Note'],
    ...[...settlements]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => [s.date, 'Settle-up', name(s.fromMember), name(s.toMember), decimal(s.amount), s.note]),
    [],
    ['Balances'],
    ...group.balances.map((b) => [name(b.memberId), decimal(b.net)]),
  ]
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function download(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
