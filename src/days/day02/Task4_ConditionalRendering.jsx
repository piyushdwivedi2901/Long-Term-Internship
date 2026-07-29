import { useState } from 'react'
import { Shield, User, Eye, Bell, LogIn, LogOut } from 'lucide-react'

/**
 * Day 2 — Task 4: Conditional Rendering
 * Goal: Show/hide content using ternaries, &&, and if/else
 * (e.g., "Login" vs "Logout" button).
 *
 * Extended: a three-tier role switch (guest / member / admin) so the same
 * component demonstrates conditional rendering branching more than two
 * ways — an if/else chain, a switch-like object lookup, ternaries, and
 * && short-circuiting all in one place.
 */
const ROLE_META = {
  guest: { icon: Eye, label: 'Guest', color: 'var(--text-faint)' },
  member: { icon: User, label: 'Member', color: 'var(--accent-strong)' },
  admin: { icon: Shield, label: 'Admin', color: 'var(--done)' },
}

export default function Task4_ConditionalRendering() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState('member')
  const [notifications, setNotifications] = useState(3)

  // if/else chain — computed before render
  let statusLabel
  if (!isLoggedIn) {
    statusLabel = 'Signed out'
  } else if (role === 'admin') {
    statusLabel = 'Signed in as an administrator'
  } else if (role === 'member') {
    statusLabel = 'Signed in as a member'
  } else {
    statusLabel = 'Browsing as a guest'
  }

  const RoleIcon = ROLE_META[role].icon

  return (
    <div className="task-section">
      <p className="task-eyebrow">Conditional Rendering</p>
      <h2>Conditional Rendering</h2>
      <p className="task-goal">The same UI branching several ways: an if/else chain, an object lookup, a ternary, and a short-circuit <code>&amp;&amp;</code>.</p>

      <div className="toolbar">
        <button className="primary" onClick={() => setIsLoggedIn((v) => !v)}>
          {isLoggedIn ? <LogOut size={13} className="icon-inline" /> : <LogIn size={13} className="icon-inline" />}
          {isLoggedIn ? 'Log out' : 'Log in'}
        </button>

        {/* Only shown once logged in — && short-circuit */}
        {isLoggedIn && (
          <div className="tab-group">
            {Object.keys(ROLE_META).filter((r) => r !== 'guest').map((r) => (
              <button
                key={r}
                className={`tab-btn ${role === r ? 'active' : ''}`}
                onClick={() => setRole(r)}
              >
                {ROLE_META[r].label}
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: isLoggedIn ? ROLE_META[role].color : 'var(--text-muted)' }}>
        <RoleIcon size={15} /> {statusLabel}
      </p>

      {/* Ternary inside a conditional block */}
      {isLoggedIn && (
        <p className="welcome-msg">
          {role === 'admin'
            ? "You have full access — user management and settings are unlocked."
            : "Welcome back — here's your dashboard."}
        </p>
      )}

      {/* && with a numeric condition */}
      {isLoggedIn && notifications > 0 && (
        <p className="badge">
          <Bell size={13} className="icon-inline" />
          {notifications} new notification{notifications === 1 ? '' : 's'}
        </p>
      )}
      {isLoggedIn && (
        <button onClick={() => setNotifications(0)} disabled={notifications === 0}>
          Clear notifications
        </button>
      )}
    </div>
  )
}
