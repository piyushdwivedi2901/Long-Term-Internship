import { FlaskConical, CheckCircle2 } from 'lucide-react'

/**
 * Day 13 — Task 25: Testing
 * Goal: Write basic tests for components using React Testing Library.
 *
 * The actual test suites live next to the components they test — this
 * page summarizes coverage since test files don't render UI themselves.
 * Run them with: npm test
 */
const suites = [
  {
    file: 'src/days/day03/Task5_CounterApp.test.jsx',
    cases: ['renders starting at 0', 'increments the count', 'decrements the count', 'resets the count to 0', 'respects a larger step size'],
  },
  {
    file: 'src/days/day04/Task8_TodoList.test.jsx',
    cases: ['renders the seeded tasks', 'adds a new task', 'toggles a task as done', 'deletes a task', 'filters to only active tasks', 'filters to only done tasks'],
  },
  {
    file: 'src/days/day08/Task15_ContextApi.test.jsx',
    cases: ['starts on the dark theme', 'cycles theme across all consumers', 'cycles back around after ocean'],
  },
  {
    file: 'src/days/day09/Task18_FormValidation.test.jsx',
    cases: ['shows required-field errors on empty submit', 'flags an invalid email format', 'flags mismatched passwords', 'submits successfully with valid input', 'shows a live password strength label'],
  },
  {
    file: 'src/days/day10/Task20_EcommerceCart.test.jsx',
    cases: ['starts with an empty cart', 'adds an item and shows a tax-inclusive total', 'increments quantity on repeat add', 'removes an item', 'applies a valid coupon', 'rejects an invalid coupon'],
  },
  {
    file: 'src/days/day13/Task24_StateManagement.test.jsx',
    cases: ['renders todos from the store', 'adds a todo via the store action', 'removes a todo via the store action', 'filters using store-owned filter state'],
  },
]

const totalCases = suites.reduce((sum, s) => sum + s.cases.length, 0)

export default function Task25_Testing() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Testing</p>
      <h2>Testing</h2>
      <p className="task-goal">Vitest + React Testing Library. Run <code>npm test</code> — checked on every push by the CI workflow before it deploys.</p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 260 }}>
        <div className="stat-card">
          <div className="stat-card-label">Suites</div>
          <div className="stat-card-value">{suites.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Test cases</div>
          <div className="stat-card-value done">{totalCases}</div>
        </div>
      </div>

      {suites.map((s) => (
        <div key={s.file} className="card" style={{ marginBottom: 14, maxWidth: 480 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <FlaskConical size={13} color="var(--accent-strong)" />{s.file}
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {s.cases.map((c) => (
              <li key={c} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={13} color="var(--done)" />{c}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
