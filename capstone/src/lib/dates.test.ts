import { describe, expect, it } from 'vitest'
import { daysBetween, describeDue, dueBucket, localToday } from './dates.ts'

describe('dates', () => {
  it('uses the local calendar day, not UTC', () => {
    expect(localToday(new Date(2026, 9, 9, 23, 30))).toBe('2026-10-09')
  })
  it('counts whole days across month ends', () => {
    expect(daysBetween('2026-09-30', '2026-10-02')).toBe(2)
    expect(daysBetween('2026-10-02', '2026-09-30')).toBe(-2)
  })
  it('labels due dates relative to today', () => {
    const t = '2026-10-09'
    expect(describeDue('2026-10-09', t)).toEqual({ label: 'Today', tone: 'soon' })
    expect(describeDue('2026-10-10', t)).toEqual({ label: 'Tomorrow', tone: 'soon' })
    expect(describeDue('2026-10-08', t)).toEqual({ label: 'Yesterday', tone: 'overdue' })
    expect(describeDue('2026-10-04', t).label).toBe('5 days late')
    expect(describeDue('2026-10-04', t, true).tone).toBe('done')
    expect(describeDue('2026-10-20', t).tone).toBe('later')
  })
  it('buckets tasks for the My tasks page', () => {
    const t = '2026-10-09'
    expect(dueBucket(null, t, false)).toBe('none')
    expect(dueBucket('2026-10-01', t, false)).toBe('overdue')
    expect(dueBucket('2026-10-01', t, true)).toBe('today') // done tasks are never "overdue"
    expect(dueBucket('2026-10-09', t, false)).toBe('today')
    expect(dueBucket('2026-10-15', t, false)).toBe('week')
    expect(dueBucket('2026-11-01', t, false)).toBe('later')
  })
})
