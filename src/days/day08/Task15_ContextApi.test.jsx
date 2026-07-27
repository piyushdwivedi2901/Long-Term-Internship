import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Task15_ContextApi from './Task15_ContextApi.jsx'

describe('Task15_ContextApi', () => {
  it('starts in light mode', () => {
    render(<Task15_ContextApi />)
    expect(screen.getByText('Header (theme: light)')).toBeInTheDocument()
    expect(screen.getByText('Switch to dark mode')).toBeInTheDocument()
  })

  it('toggles theme across all consuming components at once', () => {
    render(<Task15_ContextApi />)
    fireEvent.click(screen.getByText('Switch to dark mode'))
    expect(screen.getByText('Header (theme: dark)')).toBeInTheDocument()
    expect(screen.getByText('Switch to light mode')).toBeInTheDocument()
  })
})
