import { useState } from 'react'

/**
 * Day 2 — Task 4: Conditional Rendering
 * Goal: Show/hide content using ternaries, &&, and if/else
 * (e.g., "Login" vs "Logout" button).
 */
export default function Task4_ConditionalRendering() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [notifications, setNotifications] = useState(3)

  // if/else style — computed before render
  let statusLabel
  if (isLoggedIn) {
    statusLabel = 'Signed in'
  } else {
    statusLabel = 'Signed out'
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Conditional Rendering</p>
      <h2>Conditional Rendering</h2>
      <p className="task-goal">The same UI branching three ways: an if/else assignment, a ternary, and a short-circuit <code>&amp;&amp;</code>.</p>

      <p>{statusLabel}</p>

      {/* Ternary */}
      <button className="primary" onClick={() => setIsLoggedIn((v) => !v)}>
        {isLoggedIn ? 'Log out' : 'Log in'}
      </button>

      {/* && short-circuit rendering — only shown when logged in */}
      {isLoggedIn && (
        <p className="welcome-msg">Welcome back — here's your dashboard.</p>
      )}

      {/* && with a numeric condition */}
      {notifications > 0 && (
        <p className="badge">🔔 {notifications} new notification{notifications === 1 ? '' : 's'}</p>
      )}
      <button onClick={() => setNotifications(0)} disabled={notifications === 0}>
        Clear notifications
      </button>
    </div>
  )
}
