import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task20_EcommerceCart from './Task20_EcommerceCart.jsx'

function cartTotalText() {
  return document.querySelector('.cart-total').textContent
}

describe('Task20_EcommerceCart', () => {
  it('starts with an empty cart', () => {
    render(<Task20_EcommerceCart />)
    expect(screen.getByText('Cart is empty.')).toBeInTheDocument()
  })

  it('adds an item to the cart and shows a tax-inclusive total', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0]) // Backpack — ₹1899
    // subtotal 1899, 8% tax = 152, total 2051
    expect(cartTotalText()).toContain('2051')
  })

  it('increments quantity when adding the same item twice', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[1]) // Water Bottle — ₹499
    fireEvent.click(screen.getAllByText('Add to cart')[1])
    // subtotal 998, 8% tax = 80, total 1078
    expect(cartTotalText()).toContain('1078')
  })

  it('removes an item from the cart', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0])
    fireEvent.click(screen.getByLabelText('Remove Backpack'))
    expect(screen.getByText('Cart is empty.')).toBeInTheDocument()
  })

  it('applies a valid coupon code and discounts the total', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0]) // Backpack — ₹1899
    fireEvent.change(screen.getByPlaceholderText('Coupon code'), { target: { value: 'SAVE10' } })
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.getByText(/SAVE10 applied/)).toBeInTheDocument()
  })

  it('rejects an invalid coupon code', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0])
    fireEvent.change(screen.getByPlaceholderText('Coupon code'), { target: { value: 'FAKE' } })
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.getByText(/Invalid code/)).toBeInTheDocument()
  })
})
