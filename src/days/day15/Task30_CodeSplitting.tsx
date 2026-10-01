import { lazy, Suspense, useMemo, useState } from 'react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Home, BarChart3, Snail } from 'lucide-react'
import { ErrorBoundary } from '../../components/ErrorBoundary'

/**
 * Day 15 — Task 30: Code Splitting
 * Goal: Lazy-load one route with React.lazy + <Suspense> and a loading
 * fallback.
 *
 * `/reports` is loaded with `React.lazy(() => import(...))`, so its code is
 * a separate chunk fetched on first visit. The Suspense fallback shows while
 * it loads, and an ErrorBoundary (Task 29) covers a failed chunk download.
 *
 * Demo-only: the "cold load" button re-creates the lazy component and adds
 * an artificial delay so the fallback is visible even on a fast connection
 * (a real chunk is cached by the browser after the first load, so real
 * second visits are instant).
 */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function Nav() {
  const { pathname } = useLocation()
  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/reports', label: 'Reports (lazy)', icon: BarChart3 },
  ]
  return (
    <nav className="router-nav" aria-label="Demo routes">
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={pathname === to ? 'active' : ''}
          aria-current={pathname === to ? 'page' : undefined}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <Icon size={13} /> {label}
        </Link>
      ))}
    </nav>
  )
}

function Fallback() {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <div className="spinner-circle" />
      <span>Loading the reports chunk…</span>
    </div>
  )
}

function Demo({ delayMs, attempt }: { delayMs: number; attempt: number }) {
  // Re-created when `attempt` changes so the fallback can be shown again.
  const Reports = useMemo(
    () =>
      lazy(async () => {
        const [module] = await Promise.all([import('./Task30_HeavyReport'), delayMs ? sleep(delayMs) : undefined])
        return module
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempt],
  )

  return (
    <div className="router-page">
      <Routes>
        <Route path="/" element={<p>The home route is part of the main bundle. Open Reports to fetch its chunk.</p>} />
        <Route
          path="/reports"
          element={
            <ErrorBoundary name="Reports route" resetKeys={[attempt]}>
              <Suspense fallback={<Fallback />}>
                <Reports />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Routes>
    </div>
  )
}

export default function Task30_CodeSplitting() {
  const [slow, setSlow] = useState(false)
  const [attempt, setAttempt] = useState(0)

  return (
    <div className="task-section">
      <p className="task-eyebrow">Performance</p>
      <h2>Code Splitting</h2>
      <p className="task-goal">
        The <code>/reports</code> route is loaded with <code>React.lazy</code> and <code>&lt;Suspense&gt;</code>:
        its code ships as a separate chunk that the browser only downloads when the route is first opened.
      </p>

      <div className="toolbar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
          <Snail size={13} /> Simulate a slow network (+1.2s, demo only)
        </label>
        <button onClick={() => setAttempt((a) => a + 1)}>Simulate a cold load</button>
      </div>

      <MemoryRouter initialEntries={['/']}>
        <Nav />
        <Demo delayMs={slow ? 1200 : 0} attempt={attempt} />
      </MemoryRouter>

      <pre className="code-block" style={{ marginTop: 16 }}>{`const Reports = lazy(() => import('./Task30_HeavyReport'))

<ErrorBoundary name="Reports route">          // chunk failed to download?
  <Suspense fallback={<Spinner />}>           // chunk still loading?
    <Reports />
  </Suspense>
</ErrorBoundary>`}</pre>
    </div>
  )
}
