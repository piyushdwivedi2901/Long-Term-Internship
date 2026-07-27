/**
 * Day 13 — Task 25: Testing
 * Goal: Write basic tests for components using React Testing Library.
 *
 * The actual test suites live next to the components they test:
 *   - src/days/day03/Task5_CounterApp.test.jsx
 *   - src/days/day04/Task8_TodoList.test.jsx
 *
 * Run them with: npm test
 * This page just summarizes what's covered, since test files themselves
 * don't render UI.
 */
const suites = [
  {
    file: 'src/days/day03/Task5_CounterApp.test.jsx',
    cases: [
      'renders starting at 0',
      'increments the count',
      'decrements the count',
      'resets the count to 0',
    ],
  },
  {
    file: 'src/days/day04/Task8_TodoList.test.jsx',
    cases: [
      'renders the seeded tasks',
      'adds a new task',
      'toggles a task as done',
      'deletes a task',
    ],
  },
]

export default function Task25_Testing() {
  return (
    <div className="task-section">
      <h2>Task 25: Testing (React Testing Library + Vitest)</h2>
      <p>Run the full suite with <code>npm test</code>. Coverage:</p>
      {suites.map((s) => (
        <div key={s.file} className="card" style={{ marginBottom: 16 }}>
          <h4>{s.file}</h4>
          <ul>
            {s.cases.map((c) => (
              <li key={c}>✅ {c}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
