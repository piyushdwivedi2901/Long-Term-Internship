import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

export interface FallbackArgs {
  error: Error
  /** Clear the error and try rendering the children again. */
  reset: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Label used in the default fallback, e.g. "Weather widget". */
  name?: string
  /** Custom fallback UI. Receives the error and a reset function. */
  fallback?: ReactNode | ((args: FallbackArgs) => ReactNode)
  /** Called once per caught error — the place to report to a logging service. */
  onError?: (error: Error, info: ErrorInfo) => void
  /** When any value in this array changes, the boundary resets itself. */
  resetKeys?: readonly unknown[]
}

interface ErrorBoundaryState {
  error: Error | null
}

function keysChanged(a: readonly unknown[] = [], b: readonly unknown[] = []) {
  return a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]))
}

/**
 * Error boundary (Task 29). React only supports these as class components:
 * `getDerivedStateFromError` switches to the fallback UI during render and
 * `componentDidCatch` is the side-effect hook for reporting.
 *
 * What it catches: errors thrown while rendering, in lifecycle methods and
 * in constructors of anything below it. What it does NOT catch: errors in
 * event handlers, async code (setTimeout, fetch callbacks) and errors in
 * the boundary itself — handle those with try/catch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset()
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const { fallback, name } = this.props
    if (typeof fallback === 'function') return fallback({ error, reset: this.reset })
    if (fallback !== undefined) return fallback

    return (
      <div role="alert" className="error-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <p className="error-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={15} />
          {name ? `${name} crashed` : 'Something went wrong'}
        </p>
        <p className="hint" style={{ margin: 0 }}>{error.message}</p>
        <button onClick={this.reset}><RotateCw size={13} className="icon-inline" />Try again</button>
      </div>
    )
  }
}
