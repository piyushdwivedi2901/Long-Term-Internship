import { describe, expect, it, vi } from 'vitest'
import { silenceBoundaryErrors } from '../../test/silenceBoundaryErrors'
import { fireEvent, render, screen } from '@testing-library/react'
import Task29_ErrorBoundaries from './Task29_ErrorBoundaries'

silenceBoundaryErrors()

describe('Task29_ErrorBoundaries', () => {
  it('crashing the counter shows only its fallback and keeps the other widgets alive', () => {
    render(<Task29_ErrorBoundaries />)
    const increment = screen.getByRole('button', { name: /Increment/ })
    fireEvent.click(increment)
    fireEvent.click(increment)
    fireEvent.click(increment) // count 3 > limit 2 -> render throws

    expect(screen.getByRole('alert')).toHaveTextContent('Counter crashed')
    expect(screen.getByText('Counter exceeded its limit of 2', { selector: 'p.hint' })).toBeInTheDocument()
    // The other widgets are still rendered.
    expect(screen.getByRole('region', { name: 'Clock widget' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'JSON preview widget' })).toBeInTheDocument()
    // And the crash was reported.
    expect(screen.getByText('Counter', { selector: 'strong' })).toBeInTheDocument()
  })

  it('invalid JSON crashes the preview and fixing it recovers automatically (resetKeys)', () => {
    render(<Task29_ErrorBoundaries />)
    const box = screen.getByLabelText(/Edit to something invalid/)
    fireEvent.change(box, { target: { value: '{ oops' } })
    expect(screen.getByRole('alert')).toHaveTextContent('JSON preview crashed')
    fireEvent.change(box, { target: { value: '{ "ok": 1 }' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('"Try again" resets a crashed counter', () => {
    render(<Task29_ErrorBoundaries />)
    const increment = screen.getByRole('button', { name: /Increment/ })
    for (let i = 0; i < 3; i++) fireEvent.click(increment)
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
    // The boundary re-mounts the (fresh) counter, back at 0.
    expect(screen.getByRole('button', { name: /Increment/ })).toBeInTheDocument()
  })
})
