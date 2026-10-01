import { useEffect, useState } from 'react'
import { PlayCircle } from 'lucide-react'

/**
 * Task 39 — E2E testing (Playwright)
 * The Playwright specs live in /e2e and run in CI on every push. This page
 * reads those very files (via Vite's `?raw` glob), so the list of tests shown
 * is always the list that actually runs — it can't drift.
 */
const specFiles = import.meta.glob('/e2e/*.spec.ts', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>

interface Spec {
  file: string
  describe: string
  tests: string[]
  source: string
}

const SUITE_NOTES: Record<string, string> = {
  'todo.spec.ts': 'Todo flow — add, complete, filter, delete; and persistence across a full page reload.',
  'cart.spec.ts': 'Cart / checkout — add items, review in the portalled modal, check out; focus trap and Escape.',
  'navigation.spec.ts': 'Navigation — sidebar, deep links, browser Back, keyboard operation, unknown-route fallback.',
  'api.spec.ts': 'Real Express + SQLite API — signup, per-user isolation, forged tokens, login error parity.',
}

function parse(file: string, source: string): Spec {
  const describe = /test\.describe\(\s*['"`]([^'"`]+)/.exec(source)?.[1] ?? file
  const tests = [...source.matchAll(/^\s*test\(\s*(['"`])(.+?)\1\s*,/gm)].map((m) => m[2])
  return { file: file.replace('/e2e/', ''), describe, tests, source }
}

export default function Task39_E2ETesting() {
  const [specs, setSpecs] = useState<Spec[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      Object.entries(specFiles).map(async ([file, load]) => parse(file, await load())),
    ).then((list) => {
      if (!cancelled) setSpecs(list.sort((a, b) => a.file.localeCompare(b.file)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const total = specs?.reduce((n, s) => n + s.tests.length, 0) ?? 0

  return (
    <div className="task-section">
      <p className="task-eyebrow">Quality</p>
      <h2>E2E Testing</h2>
      <p className="task-goal">
        Playwright drives a real Chromium against the production build — covering a todo flow, a
        cart/checkout flow and navigation — plus a suite that hits the real Express + SQLite API.
        They run in CI before every deploy.
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', maxWidth: 480 }}>
        <div className="stat-card"><div className="stat-card-label">Spec files</div><div className="stat-card-value">{specs?.length ?? '…'}</div></div>
        <div className="stat-card"><div className="stat-card-label">E2E tests</div><div className="stat-card-value done" data-testid="t39-total">{specs ? total : '…'}</div></div>
        <div className="stat-card"><div className="stat-card-label">Browser</div><div className="stat-card-value">Chromium</div></div>
      </div>

      <h3><PlayCircle size={15} className="icon-inline" aria-hidden="true" />Run it</h3>
      <pre className="code-block" tabIndex={0} aria-label="Commands">{`npm run test:e2e                 # builds, serves, starts the API, runs every spec
npx playwright test e2e/cart.spec.ts --headed   # watch one flow
npx playwright show-report       # HTML report with traces on failure`}</pre>

      <h3>Suites</h3>
      {!specs && <p className="empty-state" role="status">Reading specs…</p>}
      {specs?.map((s) => (
        <section key={s.file} className="e2e-suite" aria-label={s.file}>
          <h4><code>{s.file}</code> — {s.describe}</h4>
          <p className="hint">{SUITE_NOTES[s.file]}</p>
          <ul>
            {s.tests.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <button type="button" aria-expanded={open === s.file} onClick={() => setOpen(open === s.file ? null : s.file)}>
            {open === s.file ? 'Hide source' : 'View source'}
          </button>
          {open === s.file && <pre className="code-block" tabIndex={0} aria-label={`${s.file} source`}>{s.source}</pre>}
        </section>
      ))}
    </div>
  )
}
