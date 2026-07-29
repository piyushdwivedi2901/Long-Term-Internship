import { createContext, useContext, useState } from 'react'
import { Sun, Moon, Waves, Type } from 'lucide-react'

/**
 * Day 8 — Task 15: Context API
 * Goal: Theme switcher (light/dark) shared across components
 * without prop drilling.
 *
 * Extended to three themes plus a second, independent context value
 * (font scale) — showing a context provider carrying more than one
 * piece of shared state, still with zero props passed manually.
 */
const THEMES = {
  light: { bg: '#f4f2ec', fg: '#1a1c24', icon: Sun, label: 'Light' },
  dark: { bg: '#1d2130', fg: '#ece9e2', icon: Moon, label: 'Dark' },
  ocean: { bg: '#0d2b3e', fg: '#dff3ff', icon: Waves, label: 'Ocean' },
}

const ThemeContext = createContext(null)

function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState('dark')
  const [fontScale, setFontScale] = useState(1)
  const cycleTheme = () => {
    const keys = Object.keys(THEMES)
    setThemeKey((k) => keys[(keys.indexOf(k) + 1) % keys.length])
  }
  return (
    <ThemeContext.Provider value={{ themeKey, theme: THEMES[themeKey], cycleTheme, fontScale, setFontScale }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

function Header() {
  const { theme, themeKey } = useTheme()
  const Icon = theme.icon
  return (
    <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.fg }}>
      <Icon size={15} /> {theme.label} theme active
      <span className="hint">(key: {themeKey})</span>
    </h4>
  )
}

function ThemeControls() {
  const { theme, cycleTheme, fontScale, setFontScale } = useTheme()
  return (
    <div className="button-row" style={{ alignItems: 'center' }}>
      <button onClick={cycleTheme} style={{ borderColor: theme.fg }}>Cycle theme</button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: theme.fg }}>
        <Type size={13} /> Text size
        <input
          type="range"
          min="0.85"
          max="1.3"
          step="0.05"
          value={fontScale}
          onChange={(e) => setFontScale(Number(e.target.value))}
        />
      </label>
    </div>
  )
}

function Panel({ children }) {
  const { theme } = useTheme()
  return (
    <div className="themed-panel" style={{ background: theme.bg, color: theme.fg, border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </div>
  )
}

function Body() {
  const { theme, fontScale } = useTheme()
  return (
    <p style={{ color: theme.fg, opacity: 0.85, fontSize: `${fontScale}em` }}>
      This paragraph, the header above, and the controls below are all
      separate components reading the same context — none of them received
      theme or font-scale as a prop.
    </p>
  )
}

export default function Task15_ContextApi() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Context API</p>
      <h2>Context API</h2>
      <p className="task-goal">One provider carries two shared values — theme and font scale — down to nested components with zero manual prop passing.</p>
      <ThemeProvider>
        <Panel>
          <Header />
          <Body />
          <ThemeControls />
        </Panel>
      </ThemeProvider>
    </div>
  )
}
