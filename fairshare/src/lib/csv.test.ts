import { describe, expect, it } from 'vitest'
import { groupToCsv } from './csv.ts'
import type { Expense, GroupDetail, Settlement } from '../../shared/types.ts'

const group = {
  currency: 'INR',
  members: [
    { id: 1, name: 'Piyush' },
    { id: 2, name: 'Aisha, K' },
  ],
  balances: [
    { memberId: 1, net: 5000 },
    { memberId: 2, net: -5000 },
  ],
} as unknown as GroupDetail

describe('CSV export', () => {
  it('writes expenses with per-person shares, payments and balances', () => {
    const expenses = [
      { id: 1, date: '2026-10-01', description: 'Dinner "Thalassa"', category: 'food', amount: 10000, paidBy: 1, shares: [{ memberId: 1, amount: 5000 }, { memberId: 2, amount: 5000 }] },
    ] as Expense[]
    const settlements = [] as Settlement[]
    const csv = groupToCsv(group, expenses, settlements).split('\r\n')
    expect(csv[0]).toBe(`Date,Description,Category,Amount (INR),Paid by,Piyush's share,"Aisha, K's share"`)
    expect(csv[1]).toBe('2026-10-01,"Dinner ""Thalassa""",Food & drink,100.00,Piyush,50.00,50.00')
    expect(csv.at(-1)).toBe('"Aisha, K",-50.00')
  })

  it('neutralises spreadsheet formulas in user text', () => {
    const expenses = [{ id: 1, date: '2026-10-01', description: '=HYPERLINK("x")', category: 'other', amount: 100, paidBy: 1, shares: [] }] as unknown as Expense[]
    expect(groupToCsv(group, expenses, []).split('\r\n')[1]).toContain(`"'=HYPERLINK(""x"")"`)
  })
})
