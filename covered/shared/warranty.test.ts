import { describe, expect, it } from 'vitest'
import { addDays, addMonths, daysBetween, formatRelative, resolveToday } from './dates.ts'
import { buildIcs, fold } from './ics.ts'
import { formatInr, formatInrCompact, parseInr } from './money.ts'
import type { Coverage } from './schemas.ts'
import { coverageAnswer, coverageEnd, itemStatus, layoutCoverages, meaningfulEnds } from './warranty.ts'

const std = (months: number, provider = 'LG'): Coverage => ({ kind: 'standard', label: 'Standard', months, provider })
const ext = (months: number, provider = 'Croma'): Coverage => ({ kind: 'extended', label: 'Extended', months, provider })
const part = (label: string, months: number): Coverage => ({ kind: 'component', label, months, provider: '' })

describe('calendar maths', () => {
  it('adds months the way warranty cards do, clamping to short months', () => {
    expect(addMonths('2025-03-15', 12)).toBe('2026-03-15')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29') // leap year
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28')
    expect(addMonths('2025-12-31', 2)).toBe('2026-02-28')
    expect(addMonths('2025-08-31', -6)).toBe('2025-02-28')
  })

  it('a 1-year cover bought on the 15th runs through the 14th a year later', () => {
    expect(coverageEnd('2025-03-15', 12)).toBe('2026-03-14')
    expect(coverageEnd('2024-02-29', 12)).toBe('2025-02-27')
    expect(coverageEnd('2025-01-01', 120)).toBe('2034-12-31')
  })

  it('counts days across DST-free UTC days and leap years', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
    expect(daysBetween('2026-10-09', '2026-10-09')).toBe(0)
    expect(daysBetween('2026-10-09', '2025-10-09')).toBe(-365)
    expect(addDays('2024-12-31', 1)).toBe('2025-01-01')
  })

  it('every end date is exactly the day before the anniversary (fuzz)', () => {
    for (let i = 0; i < 2000; i++) {
      const start = addDays('2015-01-01', Math.floor(Math.random() * 5000))
      const months = 1 + Math.floor(Math.random() * 240)
      const end = coverageEnd(start, months)
      expect(addDays(end, 1)).toBe(addMonths(start, months))
      expect(end >= start).toBe(true)
    }
  })

  it('describes distances in plain words', () => {
    expect(formatRelative(0)).toBe('today')
    expect(formatRelative(1)).toBe('tomorrow')
    expect(formatRelative(12)).toBe('in 12 days')
    expect(formatRelative(-90)).toBe('3 months ago')
    expect(formatRelative(1100)).toBe('in 3 years')
  })

  it("uses the user's local date only when it is within a day of the server's", () => {
    const now = new Date('2026-10-09T20:00:00Z')
    expect(resolveToday('2026-10-10', now)).toBe('2026-10-10') // already tomorrow in India
    expect(resolveToday('2026-10-12', now)).toBe('2026-10-09')
    expect(resolveToday('2026-02-30', now)).toBe('2026-10-09')
    expect(resolveToday(undefined, now)).toBe('2026-10-09')
  })
})

describe('laying out covers', () => {
  it('starts an extended warranty the day after the standard one ends', () => {
    const [s, e] = layoutCoverages('2025-03-15', [std(12), ext(24)], '2026-10-09')
    expect(s).toMatchObject({ start: '2025-03-15', end: '2026-03-14', state: 'expired' })
    expect(e).toMatchObject({ start: '2026-03-15', end: '2028-03-14', state: 'active' })
  })

  it('starts parts from the purchase date, alongside the standard warranty', () => {
    const [, c] = layoutCoverages('2023-05-01', [std(12), part('Compressor', 60)], '2026-10-09')
    expect(c).toMatchObject({ start: '2023-05-01', end: '2028-04-30', state: 'active' })
  })

  it('starts an extended warranty on the purchase date when there is no standard one', () => {
    const [e] = layoutCoverages('2026-01-10', [ext(12)], '2026-10-09')
    expect(e.start).toBe('2026-01-10')
  })

  it('treats the last covered day as still covered', () => {
    const [s] = layoutCoverages('2025-10-10', [std(12)], '2026-10-09')
    expect(s).toMatchObject({ end: '2026-10-09', state: 'active', daysLeft: 0 })
    const [next] = layoutCoverages('2025-10-10', [std(12)], '2026-10-10')
    expect(next.state).toBe('expired')
  })
})

describe('item status', () => {
  const today = '2026-10-09'
  const status = (purchase: string, covers: Coverage[], remind = 30) => itemStatus(layoutCoverages(purchase, covers, today), today, remind)

  it('is covered while the main warranty runs', () => {
    expect(status('2026-06-01', [std(12)])).toMatchObject({ status: 'covered', coveredUntil: '2027-05-31' })
  })

  it('is expiring inside the reminder window, which the user controls', () => {
    expect(status('2025-11-01', [std(12)])).toMatchObject({ status: 'expiring', daysLeft: 22 })
    expect(status('2025-11-01', [std(12)], 15).status).toBe('covered')
  })

  it('does not call a standard warranty "expiring" when an extended one follows', () => {
    expect(status('2025-11-01', [std(12), ext(12)])).toMatchObject({ status: 'covered', coveredUntil: '2027-10-31' })
  })

  it('is partial when only a part is still covered', () => {
    const r = status('2023-05-01', [std(12), part('Compressor', 60)])
    expect(r.status).toBe('partial')
    expect(r.note).toBe('Compressor until 30 Apr 2028')
  })

  it('is expired when everything has ended, and none with no covers', () => {
    expect(status('2020-01-01', [std(12), part('Panel', 24)])).toMatchObject({ status: 'expired', note: 'Ended 31 Dec 2021' })
    expect(status('2020-01-01', []).status).toBe('none')
  })

  it('only reminds about real ends', () => {
    const views = layoutCoverages('2025-11-01', [std(12), ext(12), part('Motor', 120)], today)
    expect(meaningfulEnds(views).map((v) => v.kind)).toEqual(['extended', 'component'])
  })
})

describe('"is it covered?" answers', () => {
  const today = '2026-10-09'
  const answer = (purchase: string, covers: Coverage[]) => coverageAnswer(layoutCoverages(purchase, covers, today), today, 30)

  it('says yes with the date and provider', () => {
    const a = answer('2025-11-01', [std(12), ext(24, 'Croma Protect')])
    expect(a.tone).toBe('yes')
    expect(a.headline).toBe('Yes — covered until 31 Oct 2028')
    expect(a.detail).toBe('753 days left: the standard warranty from LG runs until 31 Oct 2026, then the extended warranty from Croma Protect takes over.')
  })

  it('warns when cover is about to end', () => {
    const a = answer('2025-11-01', [std(12)])
    expect(a).toMatchObject({ tone: 'soon', headline: 'Yes — but only for 22 more days' })
  })

  it('mentions longer part cover alongside the main warranty', () => {
    expect(answer('2026-01-01', [std(12), part('Compressor', 120)]).detail).toContain('compressor is covered longer, until 31 Dec 2035')
  })

  it('names the part when only a part is covered', () => {
    const a = answer('2023-05-01', [std(12), part('Compressor', 60)])
    expect(a.tone).toBe('part')
    expect(a.headline).toBe('Only the compressor is still covered')
    expect(a.detail).toContain('The main warranty ended on 30 Apr 2024')
  })

  it('says no when it has ended', () => {
    expect(answer('2023-01-01', [std(12)])).toMatchObject({ tone: 'no', headline: 'No — the warranty ended 3 years ago' })
  })
})

describe('calendar export', () => {
  const item = {
    id: 7,
    name: 'Living room AC',
    brand: 'Voltas',
    model: '183V, Vectra',
    serialNo: 'VX-1;2',
    invoiceNo: 'INV-88',
    store: 'Croma',
    purchaseDate: '2025-11-01',
    support: { phone: '1800 266 4555', email: '', website: '' },
    coverages: layoutCoverages('2025-11-01', [std(12), ext(12), part('Compressor', 120)], '2026-10-09'),
  }
  const ics = buildIcs([item], { remindDays: 30, stamp: new Date('2026-10-09T10:00:00Z') })

  it('creates one all-day event per real end, with an alarm', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('DTSTART;VALUE=DATE:20271031')
    expect(ics).toContain('DTEND;VALUE=DATE:20271101')
    expect(ics).toContain('DTSTART;VALUE=DATE:20351031')
    expect(ics).toContain('TRIGGER:-P30D')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('escapes commas, semicolons and newlines', () => {
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('Model: Voltas 183V\\, Vectra')
    expect(unfolded).toContain('Serial: VX-1\\;2')
    expect(unfolded).toMatch(/ends on 31 Oct 2027\.\\nModel/)
  })

  it('folds long lines at 75 bytes without breaking multi-byte characters', () => {
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const folded = fold(`SUMMARY:${'₹'.repeat(40)}`)
    expect(folded.replace(/\r\n /g, '')).toBe(`SUMMARY:${'₹'.repeat(40)}`)
    for (const l of folded.split('\r\n')) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
  })

  it('skips covers that have already ended', () => {
    const old = { ...item, id: 8, coverages: layoutCoverages('2020-01-01', [std(12)], '2026-10-09') }
    expect(buildIcs([old], { remindDays: 30, stamp: new Date() })).not.toContain('BEGIN:VEVENT')
  })
})

describe('rupees', () => {
  it('formats with Indian digit grouping', () => {
    expect(formatInr(12_345_650)).toBe('₹1,23,456.5')
    expect(formatInr(5_499_000)).toBe('₹54,990')
    expect(formatInrCompact(15_000_000)).toBe('₹1.5 L')
    expect(formatInrCompact(4_500_000)).toBe('₹45k')
  })
  it('parses what people type', () => {
    expect(parseInr('54,990')).toBe(5_499_000)
    expect(parseInr('₹ 1,23,000.5')).toBe(12_300_050)
    expect(parseInr('Rs. 499')).toBe(49_900)
    expect(parseInr('12.345')).toBeNull()
    expect(parseInr('-5')).toBeNull()
  })
})
