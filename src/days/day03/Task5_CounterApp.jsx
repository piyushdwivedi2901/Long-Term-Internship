import { useEffect, useState } from 'react'
import { Minus, Plus, RotateCcw, History } from 'lucide-react'

/**
 * Day 3 — Task 5: Counter App
 * Goal: Increment/decrement/reset buttons using useState.
 *
 * Extended: a step-size selector (still defaults to 1, so the basic
 * behavior is unchanged), keyboard support (← / → / R), and a short
 * history log — showing useState managing more than one piece of state
 * at once and effects reacting to it.
 */
export default function Task5_CounterApp() {
  const [count, setCount] = useState(0)
  const [step, setStep] = useState(1)
  const [history, setHistory] = useState([])

  const record = (action, value) => {
    setHistory((h) => [{ action, value, t: Date.now() }, ...h].slice(0, 5))
  }

  const increment = () => {
    setCount((c) => c + step)
    record('+', step)
  }
  const decrement = () => {
    setCount((c) => c - step)
    record('−', step)
  }
  const reset = () => {
    setCount(0)
    record('reset', 0)
  }

  // Keyboard shortcuts: ArrowRight/ArrowLeft to step, R to reset
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
      if (e.key === 'ArrowRight') increment()
      else if (e.key === 'ArrowLeft') decrement()
      else if (e.key.toLowerCase() === 'r') reset()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div className="task-section">
      <p className="task-eyebrow">useState</p>
      <h2>Counter App</h2>
      <p className="task-goal">Increment, decrement, and reset — with an adjustable step size and keyboard shortcuts layered on top of the core state.</p>

      <p className="counter-value">{count}</p>

      <div className="toolbar">
        <div className="button-row">
          <button onClick={decrement} aria-label="Decrement"><Minus size={14} className="icon-inline" style={{ marginRight: 2 }} />Decrement</button>
          <button onClick={reset}><RotateCcw size={14} className="icon-inline" style={{ marginRight: 2 }} />Reset</button>
          <button className="primary" onClick={increment} aria-label="Increment"><Plus size={14} className="icon-inline" style={{ marginRight: 2 }} />Increment</button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Step
          <select className="select-input" value={step} onChange={(e) => setStep(Number(e.target.value))}>
            <option value={1}>1</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </label>
      </div>

      <p className="hint">
        Keyboard: <span className="kbd">←</span> / <span className="kbd">→</span> to step, <span className="kbd">R</span> to reset.
      </p>

      {history.length > 0 && (
        <>
          <hr className="section-divider" />
          <p className="task-eyebrow"><History size={12} className="icon-inline" />Recent actions</p>
          <ul className="todo-list" style={{ maxWidth: 260 }}>
            {history.map((h) => (
              <li key={h.t}>
                <span>{h.action === 'reset' ? 'Reset to 0' : `${h.action}${h.value}`}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
