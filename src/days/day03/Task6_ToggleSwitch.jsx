import { useState } from 'react'

/**
 * Day 3 — Task 6: Toggle Switch
 * Goal: Show/hide a password field, and a dark/light mode toggle.
 */
export default function Task6_ToggleSwitch() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`task-section ${darkMode ? 'dark-panel' : ''}`}>
      <h2>Task 6: Toggle Switch</h2>

      <div className="field-row">
        <label htmlFor="pw">Password</label>
        <input
          id="pw"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a password"
        />
        <button type="button" onClick={() => setShowPassword((v) => !v)}>
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="field-row">
        <label htmlFor="dark-mode-toggle">Dark mode</label>
        <input
          id="dark-mode-toggle"
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode((v) => !v)}
        />
        <span>{darkMode ? 'Dark' : 'Light'}</span>
      </div>
    </div>
  )
}
