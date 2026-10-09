import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button.tsx'

interface Props {
  children: ReactNode
  /** When any of these change, a shown error is cleared (e.g. on navigation). */
  resetKeys?: unknown[]
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Flowboard view crashed', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKeys?.some((k, i) => !Object.is(k, this.props.resetKeys?.[i]))) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const chunk = /dynamically imported module|Loading chunk/i.test(this.state.error.message)
    return (
      <div className="crash" role="alert">
        <h2>{chunk ? 'This page needs a refresh' : 'This view stopped working'}</h2>
        <p>
          {chunk
            ? 'A newer version of Flowboard was deployed. Reload to get it — your data is safe.'
            : 'The rest of Flowboard still works and your data is safe. Try again, or reload the page.'}
        </p>
        <div className="row">
          <Button variant="primary" onClick={() => (chunk ? location.reload() : this.setState({ error: null }))}>
            {chunk ? 'Reload' : 'Try again'}
          </Button>
        </div>
      </div>
    )
  }
}
