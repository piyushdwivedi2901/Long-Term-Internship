import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task20_EcommerceCart from './Task20_EcommerceCart.jsx'

describe('Task20_EcommerceCart', () => {
  it('starts with an empty cart', () => {
    render(<Task20_EcommerceCart />)
    expect(screen.getByText('Cart is empty.')).toBeInTheDocument()
  })

  it('adds an item to the cart and shows the total', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0]) // Backpack — ₹1899
    expect(screen.getByText('Total: ₹1899')).toBeInTheDocument()
  })

  it('increments quantity when adding the same item twice', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[1]) // Water Bottle — ₹499
    fireEvent.click(screen.getAllByText('Add to cart')[1])
    expect(screen.getByText('Total: ₹998')).toBeInTheDocument()
  })

  it('removes an item from the cart', () => {
    render(<Task20_EcommerceCart />)
    fireEvent.click(screen.getAllByText('Add to cart')[0])
    fireEvent.click(screen.getByText('Remove'))
    expect(screen.getByText('Cart is empty.')).toBeInTheDocument()
  })
})
