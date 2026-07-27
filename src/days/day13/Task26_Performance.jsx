import { memo, useCallback, useMemo, useState } from 'react'

/**
 * Day 13 — Task 26: Performance
 * Goal: Use useMemo, useCallback, and React.memo to optimize a list with
 * heavy re-renders. A render counter on each row makes the optimization
 * visible: toggling the unrelated "tick" counter should NOT re-render rows.
 */
function heavyCompute(n) {
  // Deliberately expensive — simulates a costly derived calculation.
  let total = 0
  for (let i = 0; i < 2_000_000; i++) total += (i % (n + 1))
  return total
}

const Row = memo(function Row({ item, onSelect }) {
  Row.renderCount = (Row.renderCount || 0) + 1
  return (
    <li>
      <button onClick={() => onSelect(item.id)}>{item.name}</button>
    </li>
  )
})

export default function Task26_Performance() {
  const [tick, setTick] = useState(0)
  const [items] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }))
  )
  const [selectedId, setSelectedId] = useState(null)

  // useMemo — only recompute the expensive value when `items.length` changes,
  // not on every "tick" re-render.
  const expensiveValue = useMemo(() => heavyCompute(items.length), [items.length])

  // useCallback — keep a stable function reference so memoized <Row> children
  // don't see a "new" prop (and re-render) just because the parent re-rendered.
  const handleSelect = useCallback((id) => setSelectedId(id), [])

  return (
    <div className="task-section">
      <h2>Task 26: Performance</h2>
      <p>
        Unrelated re-render trigger: <button onClick={() => setTick((t) => t + 1)}>Tick ({tick})</button>
      </p>
      <p className="hint">
        Clicking "Tick" re-renders this component, but thanks to <code>useMemo</code>{' '}
        the expensive calculation below does not re-run, and thanks to{' '}
        <code>React.memo</code> + <code>useCallback</code> the list rows below
        do not re-render either.
      </p>
      <p>Expensive computed value (memoized): <strong>{expensiveValue}</strong></p>
      <p>Selected item: {selectedId !== null ? items[selectedId].name : 'none'}</p>
      <ul className="perf-list">
        {items.map((item) => (
          <Row key={item.id} item={item} onSelect={handleSelect} />
        ))}
      </ul>
    </div>
  )
}
