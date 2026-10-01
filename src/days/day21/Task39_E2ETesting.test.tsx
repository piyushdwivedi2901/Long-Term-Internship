import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task39 from './Task39_E2ETesting'

describe('Task 39 – E2E page', () => {
  it('lists the specs that really exist in /e2e, with their test names', async () => {
    render(<Task39 />)
    expect(await screen.findByText(/navigation\.spec\.ts/, { selector: 'h4 code' })).toBeInTheDocument()
    expect(screen.getByText(/todo\.spec\.ts/, { selector: 'h4 code' })).toBeInTheDocument()
    expect(screen.getByText(/cart\.spec\.ts/, { selector: 'h4 code' })).toBeInTheDocument()
    expect(screen.getByText(/api\.spec\.ts/, { selector: 'h4 code' })).toBeInTheDocument()
    expect(screen.getByText(/deep links open the right task and browser Back works/)).toBeInTheDocument()
    expect(Number(screen.getByTestId('t39-total').textContent)).toBeGreaterThanOrEqual(3)
  })

  it('reveals a spec\'s source on demand', async () => {
    render(<Task39 />)
    await screen.findByText(/cart\.spec\.ts/, { selector: 'h4 code' })
    await userEvent.click(screen.getAllByRole('button', { name: 'View source' })[0])
    expect(screen.getByRole('button', { name: 'Hide source' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('pre[aria-label$="source"]')?.textContent).toContain("from '@playwright/test'")
  })
})
