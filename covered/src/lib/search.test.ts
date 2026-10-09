import { describe, expect, it } from 'vitest'
import type { ItemSummary } from '../../shared/types.ts'
import { quickAnswer, searchItems } from './search.ts'

const item = (over: Partial<ItemSummary>): ItemSummary => ({
  id: 1,
  name: 'Item',
  brand: '',
  model: '',
  category: 'other',
  purchaseDate: '2025-01-01',
  price: null,
  store: '',
  room: '',
  serialNo: '',
  status: 'covered',
  coveredUntil: '2027-01-01',
  daysLeft: 400,
  statusNote: '',
  fileCount: 0,
  openClaims: 0,
  updatedAt: '',
  ...over,
})

const items = [
  item({ id: 1, name: 'Refrigerator', brand: 'LG', category: 'kitchen', room: 'Kitchen' }),
  item({ id: 2, name: 'Living room AC', brand: 'Voltas', category: 'appliances', serialNo: 'VTS185VX5521' }),
  item({ id: 3, name: 'Phone', brand: 'Samsung', model: 'Galaxy S24', category: 'phones' }),
  item({ id: 4, name: 'Accent chair', category: 'furniture' }),
  item({ id: 5, name: 'Water purifier', brand: 'Kent', model: 'RO + UV', category: 'kitchen' }),
]
const ids = (q: string) => searchItems(items, q).map((i) => i.id)

describe('"is it covered?" search', () => {
  it('understands everyday words', () => {
    expect(ids('fridge')).toEqual([1])
    expect(ids('mobile')).toEqual([3])
    expect(ids('ro')).toEqual([5])
  })

  it('matches short words as whole words only', () => {
    // "ac" must not match "Accent chair" or "Galaxy"
    expect(ids('ac')).toEqual([2])
  })

  it('needs every word to match, across brand, model, room and serial number', () => {
    expect(ids('lg kitchen')).toEqual([1])
    expect(ids('samsung s24')).toEqual([3])
    expect(ids('vts185')).toEqual([2])
    expect(ids('lg phone')).toEqual([])
  })

  it('ranks name matches first', () => {
    expect(ids('kitchen')[0]).toBe(1)
  })

  it('answers in plain words', () => {
    expect(quickAnswer(item({ status: 'expiring', daysLeft: 1, coveredUntil: '2026-10-10' })).headline).toBe('Yes — for 1 more day')
    expect(quickAnswer(item({ status: 'expired', daysLeft: -400 })).headline).toBe('No — ended 13 months ago')
    expect(quickAnswer(item({ status: 'partial', statusNote: 'Compressor until 30 Apr 2028' }))).toMatchObject({ tone: 'part', detail: 'Compressor until 30 Apr 2028' })
  })
})
