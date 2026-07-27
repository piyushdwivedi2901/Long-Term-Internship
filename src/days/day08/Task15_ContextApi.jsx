import { createContext, useContext, useState } from 'react'

/**
 * Day 8 — Task 15: Context API
 * Goal: Theme switcher (light/dark) shared across components
 * without prop drilling.
 */
const ThemeContext = createContext(null)

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

// Nested a few levels deep — none of these need theme props passed down manually
function Header() {
  const { theme } = useTheme()
  return <h4>Header (theme: {theme})</h4>
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === 'light' ? 'dark' : 'light'} mode
    </button>
  )
}

function Panel({ children }) {
  const { theme } = useTheme()
  return <div className={`themed-panel ${theme}`}>{children}</div>
}

export default function Task15_ContextApi() {
  return (
    <div className="task-section">
      <h2>Task 15: Context API</h2>
      <ThemeProvider>
        <Panel>
          <Header />
          <p>This panel and everything inside it reads theme from context.</p>
          <ThemeToggleButton />
        </Panel>
      </ThemeProvider>
    </div>
  )
}
