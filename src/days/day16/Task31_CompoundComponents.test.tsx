import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task31 from './Task31_CompoundComponents'

describe('Task 31 – compound components', () => {
  it('drives selection through the compound parts', async () => {
    render(<Task31 />)
    expect(screen.getByTestId('t31-selected')).toHaveTextContent('intro')
    await userEvent.click(screen.getByRole('button', { name: '04 · Hooks' }))
    expect(screen.getByTestId('t31-selected')).toHaveTextContent('hooks')
    expect(screen.getByRole('button', { name: '04 · Hooks' })).toHaveAttribute('aria-current', 'page')
  })
})
