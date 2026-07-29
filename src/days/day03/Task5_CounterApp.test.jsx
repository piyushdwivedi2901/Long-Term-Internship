import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task5_CounterApp from './Task5_CounterApp.jsx'

describe('Task5_CounterApp', () => {
  it('renders starting at 0', () => {
    render(<Task5_CounterApp />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('increments the count', () => {
    render(<Task5_CounterApp />)
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('decrements the count', () => {
    render(<Task5_CounterApp />)
    fireEvent.click(screen.getByRole('button', { name: /decrement/i }))
    expect(screen.getByText('-1')).toBeInTheDocument()
  })

  it('resets the count to 0', () => {
    render(<Task5_CounterApp />)
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('respects a larger step size', () => {
    render(<Task5_CounterApp />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    expect(document.querySelector('.counter-value').textContent).toBe('5')
  })
})
