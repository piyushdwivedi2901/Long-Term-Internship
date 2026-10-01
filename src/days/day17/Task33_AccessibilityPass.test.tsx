import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Kanban from '../day12/Task23_KanbanBoard.jsx'
import Cart from '../day10/Task20_EcommerceCart.jsx'
import Shop from './Task32_Portals'
import { formatViolations, runAxe } from '../../test/axe'

describe('Task 33 – automated axe audit (no violations)', () => {
  it('Kanban board', async () => {
    const { container } = render(<Kanban />)
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('E-commerce cart with items and a coupon error', async () => {
    const { container } = render(<Cart />)
    await userEvent.click(screen.getAllByText('Add to cart')[0])
    await userEvent.type(screen.getByLabelText('Coupon code'), 'nope{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    const violations = await runAxe(container)
    expect(violations, formatViolations(violations)).toEqual([])
  })

  it('Cart modal while open (portal content is audited too)', async () => {
    render(<Shop />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Backpack to cart' }))
    await userEvent.click(screen.getByRole('button', { name: /view cart/i }))
    const violations = await runAxe(document.body)
    expect(violations, formatViolations(violations)).toEqual([])
  })
})

describe('Task 33 – Kanban keyboard support', () => {
  const card = (name: RegExp) => screen.getByRole('listitem', { name })
  const columnOf = (el: HTMLElement) => within(el.closest('section')!).getByRole('heading').textContent

  it('moves a focused card between columns with the arrow keys and keeps focus on it', async () => {
    render(<Kanban />)
    const c = card(/Design database schema/)
    c.focus()
    await userEvent.keyboard('{ArrowRight}')
    const moved = card(/Design database schema/)
    expect(columnOf(moved)).toBe('In Progress')
    expect(moved).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}')
    expect(columnOf(card(/Design database schema/))).toBe('In Progress')
  })

  it('announces moves and edge cases in a polite live region', async () => {
    render(<Kanban />)
    const live = screen.getAllByRole('status')[0]
    expect(live).toHaveAttribute('aria-live', 'polite')
    card(/Design database schema/).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(live).toHaveTextContent('Moved "Design database schema" to In Progress')
    card(/Design database schema/).focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(live).toHaveTextContent('already in the last column')
  })

  it('offers move buttons as an alternative and disables them at the edges', async () => {
    render(<Kanban />)
    expect(screen.getByRole('button', { name: 'Move "Design database schema" left' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move "Design database schema" right' }))
    expect(columnOf(card(/Design database schema/))).toBe('In Progress')
  })

  it('labels every add-card input', () => {
    render(<Kanban />)
    expect(screen.getByLabelText('New card for To Do')).toBeInTheDocument()
    expect(screen.getByLabelText('New card for Done')).toBeInTheDocument()
  })
})
