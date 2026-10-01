import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task34 from './Task34_Animation'
import { formatViolations, runAxe } from '../../test/axe'

describe('Task 34 – animation', () => {
  it('adds items to the animated list', async () => {
    render(<Task34 />)
    await userEvent.type(screen.getByLabelText('New item'), 'Ship Friday{Enter}')
    expect(screen.getByText('Ship Friday')).toBeInTheDocument()
  })

  it('removes an item once its exit animation finishes', async () => {
    render(<Task34 />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Plan the sprint' }))
    await waitFor(() => expect(screen.queryByText('Plan the sprint')).toBeNull())
  })

  it('renders the draggable list in its initial order', () => {
    render(<Task34 />)
    expect(screen.getByTestId('t34-order')).toHaveTextContent('Design → Build → Test → Ship')
  })

  it('swaps pages when the route changes (exit, then enter)', async () => {
    render(<Task34 />)
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'About' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Home' })).toBeNull()
  })

  it('has no axe violations', async () => {
    const { container } = render(<Task34 />)
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })
})
