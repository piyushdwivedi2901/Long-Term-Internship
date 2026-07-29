import { useState } from 'react'

/**
 * Day 3 — Task 5: Counter App
 * Goal: Increment/decrement/reset buttons using useState.
 */
export default function Task5_CounterApp() {
  const [count, setCount] = useState(0)

  return (
    <div className="task-section">
      <p className="task-eyebrow">useState</p>
      <h2>Counter App</h2>
      <p className="task-goal">Increment, decrement, and reset — the smallest possible demonstration of state living in a component.</p>
      <p className="counter-value">{count}</p>
      <div className="button-row">
        <button onClick={() => setCount((c) => c - 1)}>− Decrement</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button className="primary" onClick={() => setCount((c) => c + 1)}>+ Increment</button>
      </div>
    </div>
  )
}
