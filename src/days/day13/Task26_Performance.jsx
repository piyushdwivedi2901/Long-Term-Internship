import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Gauge, Zap } from 'lucide-react'

/**
 * Day 13 — Task 26: Performance
 * Goal: Use useMemo, useCallback, and React.memo to optimize a list with
 * heavy re-renders.
 *
 * Extended with a visible render counter per row (so the optimization is
 * provable, not just claimed) and a measured timing comparison between
 * the memoized calculation and a naive recompute-every-render version.
 */
function heavyCompute(n) {
  let total = 0
  for (let i = 0; i < 2_000_000; i++) total += (i % (n + 1))
  return total
}

const Row = memo(function Row({ item, onSelect, renderCounts }) {
  renderCounts.current[item.id] = (renderCounts.current[item.id] || 0) + 1
  return (
    <li>
      <button onClick={() => onSelect(item.id)}>
        {item.name} <span className="hint">({renderCounts.current[item.id]} renders)</span>
      </button>
    </li>
  )
})

export default function Task26_Performance() {
  const [tick, setTick] = useState(0)
  const [items] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }))
  )
  const [selectedId, setSelectedId] = useState(null)
  const renderCounts = useRef({})
  const [lastMemoTime, setLastMemoTime] = useState(null)
  const [lastNaiveTime, setLastNaiveTime] = useState(null)

  // useMemo — only recompute when items.length changes, not on every tick
  const expensiveValue = useMemo(() => {
    const start = performance.now()
    const result = heavyCompute(items.length)
    setLastMemoTime(Math.round(performance.now() - start))
    return result
  }, [items.length])

  // Deliberately naive comparison: recomputes on every render, no memo
  const naiveStart = performance.now()
  heavyCompute(items.length)
  const naiveElapsed = Math.round(performance.now() - naiveStart)

  const handleSelect = useCallback((id) => setSelectedId(id), [])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Performance</p>
      <h2>Performance</h2>
      <p className="task-goal">
        <code>useMemo</code>, <code>useCallback</code>, and <code>React.memo</code> working together so an unrelated
        state change doesn't re-run an expensive calculation or re-render a list.
      </p>

      <p>
        Unrelated re-render trigger: <button className="primary" onClick={() => setTick((t) => t + 1)}>Tick ({tick})</button>
      </p>
      <p className="hint">
        Clicking "Tick" re-renders this component. <code>React.memo</code> + <code>useCallback</code> keep the row
        render counts below frozen; without them, every row's count would climb with every tick.
      </p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 420 }}>
        <div className="stat-card">
          <div className="stat-card-label"><Zap size={11} className="icon-inline" />Memoized calc</div>
          <div className="stat-card-value done">{lastMemoTime ?? '—'}ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Gauge size={11} className="icon-inline" />Naive (every render)</div>
          <div className="stat-card-value" style={{ color: 'var(--danger)' }}>{naiveElapsed}ms</div>
        </div>
      </div>
      <p className="hint">Expensive value: <strong style={{ color: 'var(--text)' }}>{expensiveValue}</strong> · click "Tick" a few times — the memoized card's time stays put, the naive one re-pays the cost every time.</p>

      <p>Selected item: {selectedId !== null ? items[selectedId].name : 'none'}</p>
      <ul className="perf-list">
        {items.map((item) => (
          <Row key={item.id} item={item} onSelect={handleSelect} renderCounts={renderCounts} />
        ))}
      </ul>
    </div>
  )
}
