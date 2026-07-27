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
      <h2>Task 9: useEffect Basics</h2>
      <p>
        Click the button and watch the browser tab title update. Open the
        console to see the mount log.
      </p>
      <p className="counter-value">{count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Click me</button>
    </div>
  )
}
