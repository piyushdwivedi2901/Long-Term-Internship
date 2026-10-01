import { PackageSearch } from 'lucide-react'
import reports from './reports.json'
import { kb, pctChange } from './format'

const { before, after } = reports.bundle
const entryBefore = before.top.find((c) => c.name === 'index.js')!
const entryAfter = after.top.find((c) => c.name === 'index.js')!
const maxBytes = Math.max(...before.top.slice(0, 5).map((c) => c.bytes), ...after.top.slice(0, 5).map((c) => c.bytes))

function Bars({ title, chunks }: { title: string; chunks: typeof before.top }) {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      <ul className="bundle-bars">
        {chunks.slice(0, 6).map((c) => (
          <li key={c.name}>
            <span className="bundle-name">{c.name}</span>
            <span className="bundle-track">
              <span className="bundle-fill" style={{ width: `${(c.bytes / maxBytes) * 100}%` }} />
            </span>
            <span className="bundle-size">{kb(c.bytes)} · {kb(c.gzip)} gz</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Task41_BundleAnalysis() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Production readiness</p>
      <h2>Bundle Analysis</h2>
      <p className="task-goal">
        <code>rollup-plugin-visualizer</code> maps every byte of the build back to its package. The largest
        chunk was the entry bundle that contained <em>every</em> task; splitting it cut first-load JavaScript
        by about three quarters. Sizes below are the real minified/gzip sizes of the built files.
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', maxWidth: 560 }}>
        <div className="stat-card">
          <div className="stat-card-label">Entry chunk (gzip)</div>
          <div className="stat-card-value done" data-testid="t41-entry">{kb(entryBefore.gzip)} → {kb(entryAfter.gzip)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Change</div>
          <div className="stat-card-value done">{pctChange(entryBefore.gzip, entryAfter.gzip)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Chunks</div>
          <div className="stat-card-value">{before.chunkCount} → {after.chunkCount}</div>
        </div>
      </div>

      <div className="anim-grid">
        <Bars title="Before — one monolithic entry" chunks={before.top} />
        <Bars title="After — per-task chunks" chunks={after.top} />
      </div>

      <h3><PackageSearch size={15} className="icon-inline" aria-hidden="true" />What the analysis found</h3>
      <ol>
        <li>
          The 607 kB entry chunk bundled <code>framer-motion</code>, <code>zod</code>, <code>react-hook-form</code>,
          TanStack Query and the code of all 40 tasks. Fix: <code>React.lazy</code> per task from the registry, plus
          hover/focus prefetch so navigation stays instant.
        </li>
        <li>
          Inside what remained, TanStack Query (~48 kB unminified) was only used by Task 14. Fix: its provider moved
          into Task 14's own chunk. The entry is now essentially React + the app shell.
        </li>
        <li>
          The largest chunk today is <code>axe-core</code> ({kb(after.top[0].bytes)}). It is loaded only when you
          press “Run axe audit” in Task 33, so it costs ordinary visitors nothing — verified by the analysis,
          and the build's size warning is raised just above it so any <em>new</em> large chunk still warns.
        </li>
        <li>
          Task 34 (framer-motion) and Task 38 (zod + react-hook-form) are the next-largest chunks; they are paid for
          only by visitors who open them.
        </li>
      </ol>

      <p className="hint">
        Reproduce: <code>npm run analyze</code> writes an interactive treemap to <code>stats/treemap.html</code>;{' '}
        <code>node scripts/summarize-reports.mjs</code> regenerates the data on this page.
      </p>
    </div>
  )
}
