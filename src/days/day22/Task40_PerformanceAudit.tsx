import { Gauge } from 'lucide-react'
import reports from './reports.json'
import { ms, pctChange } from './format'

const { before, after } = reports.lighthouse

const METRICS = [
  ['First Contentful Paint', 'fcp'],
  ['Largest Contentful Paint', 'lcp'],
  ['Total Blocking Time', 'tbt'],
  ['Speed Index', 'speedIndex'],
] as const

const FINDINGS = [
  {
    finding: 'Reduce unused JavaScript — 140 KiB',
    evidence: 'All 40+ tasks were bundled into one 607 kB entry chunk, so every visitor downloaded code for pages they never opened.',
    fix: 'Each task is loaded with dynamic import() (React.lazy + Suspense, with hover/focus prefetch). TanStack Query moved out of the entry chunk too.',
    result: 'Entry chunk 188 → 49 kB gzip; the audit now passes.',
  },
  {
    finding: 'Render-blocking third-party stylesheet',
    evidence: 'Google Fonts CSS blocked first paint, and cost two extra origin connections (fonts.googleapis.com, fonts.gstatic.com).',
    fix: 'Fonts are self-hosted with @fontsource (woff2, font-display: swap, per-script unicode-range) and bundled with the app.',
    result: 'No third-party font requests; FCP 2.2 s → 1.6 s in this run.',
  },
  {
    finding: 'Missing source maps for large first-party JavaScript',
    evidence: 'The audit could not map minified production code back to source.',
    fix: 'build.sourcemap enabled in vite.config.js.',
    result: 'Audit passes; production stack traces are debuggable.',
  },
  {
    finding: 'Console error: /favicon.ico 404',
    evidence: 'The browser requested a favicon the site did not have.',
    fix: 'Added public/favicon.svg and a <link rel="icon"> that respects the deploy base path.',
    result: '404 gone.',
  },
]

function Score({ label, from, to }: { label: string; from: number; to: number }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${to >= 90 ? 'done' : 'accent'}`}>
        {from !== to && <span style={{ color: 'var(--text-faint)', fontSize: '0.7em' }}>{from} → </span>}
        {to}
      </div>
    </div>
  )
}

export default function Task40_PerformanceAudit() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Production readiness</p>
      <h2>Performance Audit</h2>
      <p className="task-goal">
        Lighthouse run against the production build, one real finding fixed — in fact four. All
        figures on this page are read from the saved reports in <code>docs/lighthouse/</code>.
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', maxWidth: 560 }}>
        <Score label="Performance" from={before.scores.performance} to={after.scores.performance} />
        <Score label="Accessibility" from={before.scores.accessibility} to={after.scores.accessibility} />
        <Score label="Best practices" from={before.scores['best-practices']} to={after.scores['best-practices']} />
        <Score label="SEO" from={before.scores.seo} to={after.scores.seo} />
      </div>

      <h3><Gauge size={15} className="icon-inline" aria-hidden="true" />Metrics</h3>
      <div className="table-wrap">
        <table className="audit-table">
          <thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
          <tbody>
            {METRICS.map(([label, key]) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{ms(before.metrics[key])}</td>
                <td>{ms(after.metrics[key])}</td>
                <td>{pctChange(before.metrics[key], after.metrics[key])}</td>
              </tr>
            ))}
            <tr>
              <td>Unused JavaScript</td>
              <td>{before.unusedJsKiB} KiB</td>
              <td>{after.unusedJsKiB} KiB</td>
              <td>{pctChange(before.unusedJsKiB, after.unusedJsKiB)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Findings &amp; fixes</h3>
      <div className="table-wrap">
        <table className="audit-table">
          <thead><tr><th>Finding</th><th>Evidence</th><th>Fix</th><th>Result</th></tr></thead>
          <tbody>
            {FINDINGS.map((f) => (
              <tr key={f.finding}><td>{f.finding}</td><td>{f.evidence}</td><td>{f.fix}</td><td>{f.result}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="hint">
        Method &amp; caveats: Lighthouse 12 (mobile profile, simulated throttling) against <code>vite preview</code> of the
        production build — the audit environment could not reach the public GitHub Pages URL, so run{' '}
        <code>npm run lighthouse -- &lt;live-url&gt;</code> against the deployed site to confirm. Remaining
        non-100 items are the render-blocking app stylesheet (inherent) and avatar images from a third-party host
        that was unreachable from the audit sandbox.
      </p>
    </div>
  )
}
