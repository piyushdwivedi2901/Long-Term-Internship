import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { House, LayoutGrid, LogOut, Moon, Plus, Settings, Sun } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.tsx'
import { useTheme } from '../lib/theme.tsx'
import { useHotkey } from '../lib/useHotkey.ts'
import { ErrorBoundary } from '../ui/ErrorBoundary.tsx'
import { Logo } from '../ui/Logo.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import { Toaster } from '../ui/Toaster.tsx'

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

/** Top bar on desktop; a bottom tab bar and a big "add" button on phones. */
export function Layout() {
  const location = useLocation()
  const { user, api, signOut } = useAuth()
  const { resolved, setPreference } = useTheme()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const adding = location.pathname === '/items/new'

  useHotkey('n', () => navigate('/items/new'), !adding)
  useEffect(() => setMenu(false), [location.pathname])
  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>Skip to content</a>
      <header className="topbar">
        <Link to="/" className="brand">
          <Logo />
          <span>Covered</span>
        </Link>
        <nav aria-label="Main" className="topnav">
          <NavLink to="/" end><House size={18} aria-hidden /> <span>Home</span></NavLink>
          <NavLink to="/items" end><LayoutGrid size={18} aria-hidden /> <span>My things</span></NavLink>
          <NavLink to="/settings"><Settings size={18} aria-hidden /> <span>Settings</span></NavLink>
        </nav>
        <div className="topbar__end">
          {api.mode === 'demo' && <span className="mode-badge" title="Your data is stored in this browser only">Demo mode</span>}
          {!adding && (
            <Link to="/items/new" className="button button--primary button--sm topbar__add" aria-keyshortcuts="N">
              <Plus size={16} aria-hidden /> <span>Add item</span>
            </Link>
          )}
          <button type="button" className="icon-btn" aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}>
            {resolved === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
          </button>
          <div className="account" ref={menuRef}>
            <button type="button" className="account__btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <span className="avatar" aria-hidden>{initials(user?.name ?? '')}</span>
              <span className="sr-only">Account menu for {user?.name}</span>
            </button>
            {menu && (
              <div
                role="menu"
                aria-label="Account"
                className="menu"
                onKeyDown={(e) => {
                  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
                  const i = items.indexOf(document.activeElement as HTMLElement)
                  if (e.key === 'ArrowDown') items[(i + 1) % items.length].focus()
                  else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length].focus()
                  else if (e.key === 'Escape' || e.key === 'Tab') setMenu(false)
                  else return
                  if (e.key !== 'Tab') e.preventDefault()
                }}
              >
                <p className="menu__who"><strong>{user?.name}</strong><span>{user?.email}</span></p>
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => navigate('/settings')}><Settings size={16} aria-hidden /> Settings</button>
                <button type="button" role="menuitem" tabIndex={-1} onClick={signOut}><LogOut size={16} aria-hidden /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="main">
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      {!adding && (
        <Link to="/items/new" className="fab" aria-label="Add item">
          <Plus size={26} aria-hidden />
        </Link>
      )}
      <Toaster />
    </div>
  )
}
