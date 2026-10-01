import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Task32, { cartTotals } from './Task32_Portals'

describe('cartTotals', () => {
  it('computes subtotal, 8% tax and item count', () => {
    expect(cartTotals([{ id: 1, qty: 1 }, { id: 2, qty: 2 }])).toEqual({
      subtotal: 2897,
      tax: 232,
      total: 3129,
      count: 3,
    })
  })
  it('is zero for an empty cart', () => {
    expect(cartTotals([]).total).toBe(0)
  })
})

describe('Task 32 – view cart modal', () => {
  it('shows an empty state and disables checkout with no items', async () => {
    render(<Task32 />)
    await userEvent.click(screen.getByRole('button', { name: /view cart/i }))
    const dialog = screen.getByRole('dialog', { name: 'Your cart' })
    expect(within(dialog).getByText('Your cart is empty.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /checkout/i })).toBeDisabled()
  })

  it('adds items, adjusts quantity in the portal, and checks out', async () => {
    render(<Task32 />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Backpack to cart' }))
    expect(screen.getByRole('button', { name: /view cart, 1 items/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /view cart/i }))

    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Increase Backpack' }))
    expect(within(dialog).getByText('Checkout · ₹4102')).toBeInTheDocument() // 3798 + 304

    await userEvent.click(within(dialog).getByRole('button', { name: /checkout/i }))
    expect(screen.getByRole('dialog', { name: 'Order placed' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/ORD-\d{4}/)

    await userEvent.click(screen.getByRole('button', { name: 'Continue shopping' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: /view cart, 0 items/i })).toBeInTheDocument()
  })

  it('removes a line when its quantity drops to zero', async () => {
    render(<Task32 />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Desk Lamp to cart' }))
    await userEvent.click(screen.getByRole('button', { name: /view cart/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease Desk Lamp' }))
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
  })
})
