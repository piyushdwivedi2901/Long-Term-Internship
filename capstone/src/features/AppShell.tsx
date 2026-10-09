import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { FolderKanban, LayoutDashboard, ListChecks, Menu, Moon, Plus, Search, Settings, Sun } from 'lucide-react'
import { useProjects } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { useHotkey } from '../lib/useHotkey.ts'
import { useTheme } from '../lib/theme.tsx'
import { useUi } from '../lib/uiStore.ts'
import { LineDot } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { ErrorBoundary } from '../ui/ErrorBoundary.tsx'
import { Logo } from '../ui/Logo.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import { Toaster } from '../ui/Toaster.tsx'
import { CommandPalette } from './palette/CommandPalette.tsx'
import { ProjectDialog } from './projects/ProjectDialog.tsx'
import { NewTaskDialog } from './tasks/NewTaskDialog.tsx'
import { TaskDrawer } from './tasks/TaskDrawer.tsx'
import { UserMenu } from './UserMenu.tsx'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function AppShell() {
  const location = useLocation()
  const { api } = useAuth()
  const { resolved, setPreference } = useTheme()
  const { data: projects } = useProjects()
  const openNewTask = useUi((s) => s.openNewTask)
  const setPaletteOpen = useUi((s) => s.setPaletteOpen)
  const newProjectOpen = useUi((s) => s.newProjectOpen)
  const setNewProjectOpen = useUi((s) => s.setNewProjectOpen)
  const [railOpen, setRailOpen] = useState(false)

  useHotkey('c', () => openNewTask())
  useEffect(() => setRailOpen(false), [location.pathname])

  return (
    <MotionConfig reducedMotion="user">
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>

      <aside className={`rail${railOpen ? ' rail--open' : ''}`} aria-label="Sidebar">
        <div className="rail__brand">
          <Logo />
          <span>Flowboard</span>
        </div>
        <nav aria-label="Main">
          <ul className="nav">
            <li><NavLink to="/" end><LayoutDashboard size={18} aria-hidden /> Dashboard</NavLink></li>
            <li><NavLink to="/tasks"><ListChecks size={18} aria-hidden /> My tasks</NavLink></li>
            <li><NavLink to="/projects" end><FolderKanban size={18} aria-hidden /> Projects</NavLink></li>
          </ul>
        </nav>
        <nav aria-label="Projects" className="rail__lines">
          <h2 className="rail__heading">Lines</h2>
          <ul className="nav nav--lines">
            {projects?.map((p) => (
              <li key={p.id}>
                <NavLink to={`/projects/${p.id}`}>
                  <LineDot color={p.color} /> <span className="truncate">{p.name}</span>
                  <span className="nav__count" aria-label={`${p.counts.todo + p.counts.in_progress + p.counts.review} open tasks`}>
                    {p.counts.todo + p.counts.in_progress + p.counts.review}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
          <button type="button" className="rail__add" onClick={() => setNewProjectOpen(true)}>
            <Plus size={16} aria-hidden /> New project
          </button>
        </nav>
        <div className="rail__foot">
          <NavLink to="/settings" className="rail__settings"><Settings size={18} aria-hidden /> Settings</NavLink>
          {api.mode === 'demo' && (
            <p className="rail__mode" title="Data is stored in this browser. Run the Express server for a shared database.">
              Demo mode · saved in this browser
            </p>
          )}
        </div>
      </aside>
      {railOpen && <div className="rail-scrim" onClick={() => setRailOpen(false)} aria-hidden />}

      <div className="main-col">
        <header className="topbar">
          <button type="button" className="icon-button topbar__menu" aria-label="Open navigation" aria-expanded={railOpen} onClick={() => setRailOpen((o) => !o)}>
            <Menu size={20} aria-hidden />
          </button>
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={16} aria-hidden />
            <span>Search or jump to…</span>
            <kbd aria-hidden>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <div className="topbar__actions">
            <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => openNewTask()}>
              New task
            </Button>
            <button
              type="button"
              className="icon-button"
              aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
            >
              {resolved === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
            <UserMenu />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="main">
          <ErrorBoundary resetKeys={[location.pathname]}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <TaskDrawer />
      <NewTaskDialog />
      <ProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
      <CommandPalette />
      <Toaster />
    </div>
    </MotionConfig>
  )
}
