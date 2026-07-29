import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task15_ContextApi from './Task15_ContextApi.jsx'

describe('Task15_ContextApi', () => {
  it('starts on the dark theme', () => {
    render(<Task15_ContextApi />)
    expect(screen.getByText(/Dark theme active/)).toBeInTheDocument()
  })

  it('cycles theme across all consuming components at once', () => {
    render(<Task15_ContextApi />)
    fireEvent.click(screen.getByText('Cycle theme'))
    expect(screen.getByText(/Ocean theme active/)).toBeInTheDocument()
  })

  it('cycles back around to light after ocean', () => {
    render(<Task15_ContextApi />)
    fireEvent.click(screen.getByText('Cycle theme'))
    fireEvent.click(screen.getByText('Cycle theme'))
    expect(screen.getByText(/Light theme active/)).toBeInTheDocument()
  })
})
