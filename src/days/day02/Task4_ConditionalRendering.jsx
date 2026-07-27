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
    statusLabel = 'You are logged in'
  } else {
    statusLabel = 'You are logged out'
  }

  return (
    <div className="task-section">
      <h2>Task 4: Conditional Rendering</h2>

      <p>{statusLabel}</p>

      {/* Ternary */}
      <button onClick={() => setIsLoggedIn((v) => !v)}>
        {isLoggedIn ? 'Logout' : 'Login'}
      </button>

      {/* && short-circuit rendering — only shown when logged in */}
      {isLoggedIn && (
        <p className="welcome-msg">Welcome back! Here is your dashboard.</p>
      )}

      {/* && with a numeric condition */}
      {notifications > 0 && (
        <p className="badge">🔔 You have {notifications} new notifications</p>
      )}
      <button onClick={() => setNotifications(0)} disabled={notifications === 0}>
        Clear notifications
      </button>
    </div>
  )
}
