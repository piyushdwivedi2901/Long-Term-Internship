import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Task40 from './Task40_PerformanceAudit'
import Task41 from './Task41_BundleAnalysis'
import { kb, ms, pctChange } from './format'
import reports from './reports.json'
import { formatViolations, runAxe } from '../../test/axe'

describe('format helpers', () => {
  it('formats sizes, durations and changes', () => {
    expect(kb(48_708)).toBe('49 kB')
    expect(kb(1_346)).toBe('1.3 kB')
    expect(ms(1615)).toBe('1.6 s')
    expect(ms(0)).toBe('0 ms')
    expect(pctChange(100, 25)).toBe('−75%')
    expect(pctChange(10, 20)).toBe('+100%')
    expect(pctChange(0, 0)).toBe('—')
  })
})

describe('Task 40 – performance audit page', () => {
  it('renders the measured before → after scores from the saved reports', () => {
    render(<Task40 />)
    const { before, after } = reports.lighthouse
    expect(screen.getByText('Performance').nextElementSibling).toHaveTextContent(
      `${before.scores.performance} → ${after.scores.performance}`,
    )
    expect(after.scores.performance).toBeGreaterThanOrEqual(before.scores.performance)
  })

  it('lists the fixed findings, including the unused-JavaScript fix', () => {
    render(<Task40 />)
    const row = screen.getByText(/Reduce unused JavaScript/).closest('tr')!
    expect(within(row).getByText(/React\.lazy/)).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Task40 />)
    const v = await runAxe(container)
    expect(v, formatViolations(v)).toEqual([])
  })
})

describe('Task 41 – bundle analysis page', () => {
  it('shows a real reduction in the entry chunk', () => {
    const { before, after } = reports.bundle
    const entry = (b: typeof before) => b.top.find((c) => c.name === 'index.js')!
    expect(entry(after).gzip).toBeLessThan(entry(before).gzip / 2)
    render(<Task41 />)
    expect(screen.getByTestId('t41-entry')).toHaveTextContent('→')
  })

  it('identifies axe-core as the largest remaining chunk', () => {
    expect(reports.bundle.after.top[0].name).toBe('axe.js')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Task41 />)
    const v = await runAxe(container)
    expect(v, formatViolations(v)).toEqual([])
  })
})
