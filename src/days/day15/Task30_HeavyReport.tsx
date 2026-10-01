import { BarChart3 } from 'lucide-react'

/**
 * The lazily-loaded route for Task 30. Nothing imports this file
 * statically — it is only reached through `import()` in
 * Task30_CodeSplitting.tsx, so the bundler emits it as its own chunk and
 * the browser fetches it the first time the /reports route is opened.
 */
const weeks = [
  { label: 'Wk 1', tasks: 8 },
  { label: 'Wk 2', tasks: 4 },
  { label: 'Wk 3', tasks: 6 },
  { label: 'Wk 4', tasks: 5 },
  { label: 'Wk 5', tasks: 3 },
  { label: 'Wk 6', tasks: 8 },
  { label: 'Wk 7', tasks: 7 },
]

/** The URL this chunk was actually served from — proof it's separate. */
function chunkFileName(): string {
  try {
    return new URL(import.meta.url).pathname.split('/').pop() ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export default function Task30_HeavyReport() {
  const max = Math.max(...weeks.map((w) => w.tasks))
  return (
    <div>
      <h4><BarChart3 size={15} className="icon-inline" />Tasks completed per week</h4>
      <svg
        role="img"
        aria-label={`Bar chart of tasks per week: ${weeks.map((w) => `${w.label} ${w.tasks}`).join(', ')}`}
        viewBox="0 0 280 120"
        width="100%"
        style={{ maxWidth: 420 }}
      >
        {weeks.map((w, i) => {
          const h = (w.tasks / max) * 80
          return (
            <g key={w.label} transform={`translate(${i * 38 + 8}, 0)`}>
              <rect x="0" y={90 - h} width="26" height={h} rx="3" fill="var(--accent)" />
              <text x="13" y={86 - h} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{w.tasks}</text>
              <text x="13" y="106" textAnchor="middle" fontSize="8" fill="var(--text-faint)">{w.label}</text>
            </g>
          )
        })}
      </svg>
      <p className="hint" style={{ marginBottom: 0 }}>
        Served from chunk: <code data-testid="chunk-name">{chunkFileName()}</code>
      </p>
    </div>
  )
}
