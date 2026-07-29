import { useState } from 'react'
import { Eye, EyeOff, Moon, Sun, Bell, Volume2, VolumeX } from 'lucide-react'

/**
 * Day 3 — Task 6: Toggle Switch
 * Goal: Show/hide a password field, and a dark/light mode toggle.
 *
 * Extended into a small "settings panel" with three independent boolean
 * toggles (dark mode, notifications, sound) plus the password visibility
 * toggle — showing several booleans living side by side in one component.
 */
function Switch({ checked, onChange, label, id }) {
  return (
    <label htmlFor={id} className="field-row" style={{ cursor: 'pointer', justifyContent: 'space-between', maxWidth: 300 }}>
      <span>{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        id={id}
        tabIndex={0}
        onClick={onChange}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange()}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: checked ? 'var(--accent)' : 'var(--border)',
          position: 'relative',
          transition: 'background 0.15s ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s ease',
          }}
        />
      </span>
    </label>
  )
}

export default function Task6_ToggleSwitch() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [sound, setSound] = useState(false)

  return (
    <div className={`task-section ${!darkMode ? 'themed-panel light' : ''}`} style={!darkMode ? { padding: 22 } : undefined}>
      <p className="task-eyebrow">Boolean State</p>
      <h2>Toggle Switch</h2>
      <p className="task-goal">Four independent on/off states in one settings panel — each is its own <code>useState(true/false)</code>.</p>

      <div className="field-row">
        <label htmlFor="pw">Password</label>
        <input
          id="pw"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a password"
        />
        <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      <hr className="section-divider" style={{ margin: '18px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Switch id="dark-mode-toggle" checked={darkMode} onChange={() => setDarkMode((v) => !v)} label={<><Moon size={13} className="icon-inline" />Dark mode</>} />
        <Switch id="notif-toggle" checked={notifications} onChange={() => setNotifications((v) => !v)} label={<><Bell size={13} className="icon-inline" />Notifications</>} />
        <Switch id="sound-toggle" checked={sound} onChange={() => setSound((v) => !v)} label={<><Volume2 size={13} className="icon-inline" />Sound effects</>} />
      </div>

      <p className="hint" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {darkMode ? <Moon size={13} /> : <Sun size={13} />}
        Currently: {darkMode ? 'Dark' : 'Light'} preview mode
        {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
      </p>
    </div>
  )
}
