import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, focusManager, useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, Zap } from 'lucide-react'

/**
 * Task 37 — Data fetching library
 * `useFetch` (hand-rolled, Task 14/27) is migrated to TanStack Query — see
 * `hooks/useJson.ts`, which keeps the same `{ data, status, error }` shape.
 *
 * This page makes the difference observable. Both panels load the same
 * (simulated) endpoint; hide/show a panel and trigger a window-focus event,
 * then compare how many network requests each approach made.
 */
interface Snapshot {
  title: string
  fetchedAt: string
}

interface Props {
  /** Simulated network latency. Tests pass a tiny value. */
  latencyMs?: number
}

type Stale = 0 | 10_000

/* ---- "before": the hand-rolled hook pattern (effect + state, no cache) ---- */
function useLegacyFetch(fetcher: () => Promise<Snapshot>) {
  const [data, setData] = useState<Snapshot | null>(null)
  useEffect(() => {
    let cancelled = false
    fetcher().then((d) => {
      if (!cancelled) setData(d)
    })
    return () => {
      cancelled = true
    }
    // fetcher identity is stable for the component's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return data
}

function LegacyPanel({ fetcher }: { fetcher: () => Promise<Snapshot> }) {
  const data = useLegacyFetch(fetcher)
  return data ? (
    <p data-testid="t37-legacy-data">{data.title} <span className="hint">· fetched {data.fetchedAt}</span></p>
  ) : (
    <p className="empty-state" role="status">Loading…</p>
  )
}

/* ---- "after": TanStack Query ---- */
function QueryPanel({ fetcher }: { fetcher: () => Promise<Snapshot> }) {
  const q = useQuery({ queryKey: ['t37-snapshot'], queryFn: fetcher })
  return q.data ? (
    <p data-testid="t37-query-data">
      {q.data.title} <span className="hint">· fetched {q.data.fetchedAt}</span>
      {q.isFetching && <span className="pill" style={{ marginLeft: 8 }}>revalidating…</span>}
    </p>
  ) : (
    <p className="empty-state" role="status">Loading…</p>
  )
}

function Demo({ latencyMs, stale }: { latencyMs: number; stale: Stale }) {
  const [calls, setCalls] = useState({ legacy: 0, query: 0 })
  const [showLegacy, setShowLegacy] = useState(true)
  const [showQuery, setShowQuery] = useState(true)
  // A fresh client per staleTime setting, so each run starts with an empty cache.
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: stale, retry: false } } }),
  )

  const makeFetcher = (key: 'legacy' | 'query') => async (): Promise<Snapshot> => {
    setCalls((c) => ({ ...c, [key]: c[key] + 1 }))
    await new Promise((r) => setTimeout(r, latencyMs))
    return { title: 'Latest posts', fetchedAt: new Date().toLocaleTimeString() }
  }
  const [legacyFetcher] = useState(() => makeFetcher('legacy'))
  const [queryFetcher] = useState(() => makeFetcher('query'))

  const simulateFocus = () => {
    // TanStack Query listens for the tab becoming visible again.
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  }

  return (
    <QueryClientProvider client={client}>
      <div className="anim-grid">
        <section aria-labelledby="t37-before">
          <h3 id="t37-before">Before · hand-rolled <code>useFetch</code></h3>
          <button type="button" onClick={() => setShowLegacy((v) => !v)}>
            {showLegacy ? <EyeOff size={13} className="icon-inline" aria-hidden="true" /> : <Eye size={13} className="icon-inline" aria-hidden="true" />}
            {showLegacy ? 'Hide panel' : 'Show panel'}
          </button>
          <div className="t37-panel">{showLegacy && <LegacyPanel fetcher={legacyFetcher} />}</div>
          <p className="result-count">Network requests: <strong data-testid="t37-legacy-calls">{calls.legacy}</strong></p>
        </section>

        <section aria-labelledby="t37-after">
          <h3 id="t37-after">After · TanStack Query</h3>
          <button type="button" onClick={() => setShowQuery((v) => !v)}>
            {showQuery ? <EyeOff size={13} className="icon-inline" aria-hidden="true" /> : <Eye size={13} className="icon-inline" aria-hidden="true" />}
            {showQuery ? 'Hide panel' : 'Show panel'}
          </button>
          <div className="t37-panel">{showQuery && <QueryPanel fetcher={queryFetcher} />}</div>
          <p className="result-count">Network requests: <strong data-testid="t37-query-calls">{calls.query}</strong></p>
        </section>
      </div>
      <p>
        <button type="button" onClick={simulateFocus}>
          <Zap size={13} className="icon-inline" aria-hidden="true" />Simulate returning to this tab
        </button>
      </p>
    </QueryClientProvider>
  )
}

export default function Task37_TanStackQuery({ latencyMs = 600 }: Props) {
  const [stale, setStale] = useState<Stale>(10_000)

  return (
    <div className="task-section">
      <p className="task-eyebrow">Data fetching</p>
      <h2>TanStack Query</h2>
      <p className="task-goal">
        The hand-rolled fetch hook is replaced by TanStack Query (<code>useJson</code>, now used by Task 14).
        Hide and re-show each panel: the old hook refetches every mount, the cache serves instantly.
        Switch the freshness window to 0 to see background revalidation and refetch-on-focus.
      </p>

      <div className="toolbar">
        <div className="tab-group" role="group" aria-label="Freshness window (staleTime)">
          {([10_000, 0] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`tab-btn ${stale === v ? 'active' : ''}`}
              aria-pressed={stale === v}
              onClick={() => setStale(v)}
            >
              {v === 0 ? 'staleTime 0s' : 'staleTime 10s'}
            </button>
          ))}
        </div>
      </div>

      {/* key → switching the setting remounts with a clean cache and counters */}
      <Demo key={stale} latencyMs={latencyMs} stale={stale} />
    </div>
  )
}
