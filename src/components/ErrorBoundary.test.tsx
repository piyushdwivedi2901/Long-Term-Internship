import { describe, expect, it, vi } from 'vitest'
import { silenceBoundaryErrors } from '../test/silenceBoundaryErrors'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom')
  return <p>all good</p>
}

silenceBoundaryErrors()

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(<ErrorBoundary><Bomb explode={false} /></ErrorBoundary>)
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('shows the default fallback with the error message', () => {
    render(<ErrorBoundary name="Widget"><Bomb explode /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Widget crashed')
    expect(screen.getByText('kaboom')).toBeInTheDocument()
  })

  it('calls onError once with the error', () => {
    const onError = vi.fn()
    render(<ErrorBoundary onError={onError}><Bomb explode /></ErrorBoundary>)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(onError.mock.calls[0][0].message).toBe('kaboom')
  })

  it('supports a render-prop fallback with reset()', () => {
    function Harness() {
      const [explode, setExplode] = useState(true)
      return (
        <ErrorBoundary
          fallback={({ error, reset }) => (
            <button onClick={() => { setExplode(false); reset() }}>recover from {error.message}</button>
          )}
        >
          <Bomb explode={explode} />
        </ErrorBoundary>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'recover from kaboom' }))
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('resets automatically when resetKeys change', () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={[1]}><Bomb explode /></ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(<ErrorBoundary resetKeys={[2]}><Bomb explode={false} /></ErrorBoundary>)
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('isolates the failure: siblings outside the boundary keep rendering', () => {
    render(
      <div>
        <ErrorBoundary><Bomb explode /></ErrorBoundary>
        <p>sibling still here</p>
      </div>,
    )
    expect(screen.getByText('sibling still here')).toBeInTheDocument()
  })
})
