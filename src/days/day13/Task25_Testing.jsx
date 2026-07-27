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
  {
    file: 'src/days/day08/Task15_ContextApi.test.jsx',
    cases: [
      'starts in light mode',
      'toggles theme across all consuming components at once',
    ],
  },
  {
    file: 'src/days/day09/Task18_FormValidation.test.jsx',
    cases: [
      'shows required-field errors on empty submit',
      'flags an invalid email format',
      'flags mismatched passwords',
      'submits successfully with valid input',
    ],
  },
  {
    file: 'src/days/day10/Task20_EcommerceCart.test.jsx',
    cases: [
      'starts with an empty cart',
      'adds an item to the cart and shows the total',
      'increments quantity when adding the same item twice',
      'removes an item from the cart',
    ],
  },
  {
    file: 'src/days/day13/Task24_StateManagement.test.jsx',
    cases: [
      'renders todos from the store',
      'adds a todo via the store action',
      'removes a todo via the store action',
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
