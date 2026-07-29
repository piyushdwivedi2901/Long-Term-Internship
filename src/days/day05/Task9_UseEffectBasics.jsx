import { useEffect, useState } from 'react'
import { Clock, Terminal, Play, Pause } from 'lucide-react'

/**
 * Day 5 — Task 9: useEffect Basics
 * Goal: Log something on mount, and update document.title based on state.
 *
 * Extended with a third effect: a real ticking clock built on
 * setInterval, with a pause toggle, so the dependency array and the
 * cleanup function both get exercised (interval restarts on pause,
 * clears on unmount) rather than just running once.
 */
export default function Task9_UseEffectBasics() {
  const [count, setCount] = useState(0)
  const [mountLog, setMountLog] = useState([])
  const [time, setTime] = useState(new Date())
  const [running, setRunning] = useState(true)

  // Effect 1 — runs once on mount (empty dependency array)
  useEffect(() => {
    setMountLog((log) => [...log, `Mounted at ${new Date().toLocaleTimeString()}`])
    return () => console.log('Task9_UseEffectBasics unmounted')
  }, [])

  // Effect 2 — runs whenever `count` changes, syncs the tab title
  useEffect(() => {
    document.title = count === 0 ? 'Long Term Internship' : `Clicks: ${count}`
    return () => {
      document.title = 'Long Term Internship'
    }
  }, [count])

  // Effect 3 — a live interval, demonstrating setup + cleanup on a
  // dependency change (`running`), not just on mount/unmount
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [running])

  return (
    <div className="task-section">
      <p className="task-eyebrow">useEffect</p>
      <h2>useEffect Basics</h2>
      <p className="task-goal">Three effects: a mount-only log, a click counter synced to the tab title, and a live clock with its own setup/cleanup cycle.</p>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 400 }}>
        <div className="stat-card">
          <div className="stat-card-label"><Clock size={11} className="icon-inline" />Live clock</div>
          <div className="stat-card-value accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {time.toLocaleTimeString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Click count</div>
          <div className="stat-card-value">{count}</div>
        </div>
      </div>

      <div className="button-row">
        <button className="primary" onClick={() => setCount((c) => c + 1)}>Click me</button>
        <button onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={13} className="icon-inline" /> : <Play size={13} className="icon-inline" />}
          {running ? 'Pause clock' : 'Resume clock'}
        </button>
      </div>

      <p className="hint" style={{ marginTop: 10 }}>Watch the browser tab title change as you click.</p>

      <hr className="section-divider" />
      <p className="task-eyebrow"><Terminal size={12} className="icon-inline" />Mount effect log</p>
      <ul className="todo-list" style={{ maxWidth: 320 }}>
        {mountLog.map((entry, i) => <li key={i}><span>{entry}</span></li>)}
      </ul>
    </div>
  )
}
