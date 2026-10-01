import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Task30_CodeSplitting from './Task30_CodeSplitting'

describe('Task30_CodeSplitting', () => {
  it('starts on the eager home route without loading the report', () => {
    render(<Task30_CodeSplitting />)
    expect(screen.getByText(/home route is part of the main bundle/)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Bar chart/ })).not.toBeInTheDocument()
  })

  it('shows the Suspense fallback, then the lazy route', async () => {
    render(<Task30_CodeSplitting />)
    fireEvent.click(screen.getByLabelText(/Simulate a slow network/))
    fireEvent.click(screen.getByRole('button', { name: 'Simulate a cold load' }))
    fireEvent.click(screen.getByRole('link', { name: /Reports/ }))

    expect(screen.getByRole('status')).toHaveTextContent('Loading the reports chunk')
    const chart = await screen.findByRole('img', { name: /Bar chart of tasks per week/ }, { timeout: 4000 })
    expect(chart).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByTestId('chunk-name')).toBeInTheDocument()
  })

  it('marks the active route link with aria-current', () => {
    render(<Task30_CodeSplitting />)
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('aria-current', 'page')
  })
})
