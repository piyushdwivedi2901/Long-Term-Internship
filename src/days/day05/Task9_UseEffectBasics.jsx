import { useEffect, useState } from 'react'

/**
 * Day 5 — Task 9: useEffect Basics
 * Goal: Log something on mount, and update document.title based on state.
 */
export default function Task9_UseEffectBasics() {
  const [count, setCount] = useState(0)

  // Runs once on mount (empty dependency array)
  useEffect(() => {
    console.log('Task9_UseEffectBasics mounted')
    return () => console.log('Task9_UseEffectBasics unmounted')
  }, [])

  // Runs whenever `count` changes
  useEffect(() => {
    document.title = count === 0 ? 'Long Term Internship' : `Clicks: ${count}`
    return () => {
      document.title = 'Long Term Internship'
    }
  }, [count])

  return (
    <div className="task-section">
      <p className="task-eyebrow">useEffect</p>
      <h2>useEffect Basics</h2>
      <p className="task-goal">One effect runs once on mount and logs to the console; another syncs the browser tab title to state on every change.</p>
      <p className="counter-value">{count}</p>
      <button className="primary" onClick={() => setCount((c) => c + 1)}>Click me</button>
      <p className="hint" style={{ marginTop: 12 }}>Watch the tab title change, and check the console for the mount log.</p>
    </div>
  )
}
