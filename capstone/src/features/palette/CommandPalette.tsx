import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, LayoutDashboard, ListChecks, LogOut, Moon, Plus, Search, Settings, Sun } from 'lucide-react'
import { STATUS_LABELS } from '../../../shared/schemas.ts'
import { projectById, useProjects, useTasks } from '../../api/hooks.ts'
import { useAuth } from '../../auth/AuthContext.tsx'
import { useHotkey } from '../../lib/useHotkey.ts'
import { useTheme } from '../../lib/theme.tsx'
import { useUi } from '../../lib/uiStore.ts'
import { LineDot } from '../../ui/bits.tsx'
import { Modal } from '../../ui/Modal.tsx'

interface Item {
  id: string
  group: 'Actions' | 'Projects' | 'Tasks'
  label: string
  hint?: string
  icon: ReactNode
  run(): void
}

/** ⌘K / Ctrl+K: jump to any project or task, or run an action. */
export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen)
  const setOpen = useUi((s) => s.setPaletteOpen)
  useHotkey('mod+k', () => setOpen(!useUi.getState().paletteOpen))

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Search Flowboard" size="md">
      <PaletteBody onDone={() => setOpen(false)} />
    </Modal>
  )
}

function PaletteBody({ onDone }: { onDone(): void }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { resolved, setPreference } = useTheme()
  const openNewTask = useUi((s) => s.openNewTask)
  const setNewProjectOpen = useUi((s) => s.setNewProjectOpen)
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listId = useId()

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => navigate(to)
    const actions: Item[] = [
      { id: 'a-new-task', group: 'Actions', label: 'New task', hint: 'C', icon: <Plus size={16} />, run: () => openNewTask() },
      { id: 'a-new-project', group: 'Actions', label: 'New project', icon: <Plus size={16} />, run: () => setNewProjectOpen(true) },
      { id: 'a-dash', group: 'Actions', label: 'Go to dashboard', icon: <LayoutDashboard size={16} />, run: go('/') },
      { id: 'a-projects', group: 'Actions', label: 'Go to projects', icon: <FolderKanban size={16} />, run: go('/projects') },
      { id: 'a-tasks', group: 'Actions', label: 'Go to my tasks', icon: <ListChecks size={16} />, run: go('/tasks') },
      { id: 'a-settings', group: 'Actions', label: 'Open settings', icon: <Settings size={16} />, run: go('/settings') },
      {
        id: 'a-theme',
        group: 'Actions',
        label: resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
        run: () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
      },
      { id: 'a-signout', group: 'Actions', label: 'Sign out', icon: <LogOut size={16} />, run: signOut },
    ]
    const q = query.trim().toLowerCase()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    return [
      ...actions.filter((a) => match(a.label)),
      ...projects
        .filter((p) => match(p.name))
        .slice(0, 6)
        .map<Item>((p) => ({ id: `p-${p.id}`, group: 'Projects', label: p.name, icon: <LineDot color={p.color} />, run: go(`/projects/${p.id}`) })),
      ...(q
        ? tasks
            .filter((t) => match(t.title) || t.labels.some(match))
            .slice(0, 8)
            .map<Item>((t) => {
              const project = projectById(projects, t.projectId)
              return {
                id: `t-${t.id}`,
                group: 'Tasks',
                label: t.title,
                hint: `${project?.name ?? ''} · ${STATUS_LABELS[t.status]}`,
                icon: project ? <LineDot color={project.color} /> : null,
                run: go(`/projects/${t.projectId}?task=${t.id}`),
              }
            })
        : []),
    ]
  }, [query, projects, tasks, navigate, openNewTask, setNewProjectOpen, resolved, setPreference, signOut])

  const active = Math.min(cursor, Math.max(items.length - 1, 0))
  const run = (item?: Item) => {
    if (!item) return
    onDone()
    // Let the palette's close commit before a navigation suspends rendering.
    setTimeout(item.run, 0)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((active + 1) % Math.max(items.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((active - 1 + items.length) % Math.max(items.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(items[active])
    }
  }

  let lastGroup = ''
  return (
    <div className="palette">
      <div className="palette__search">
        <Search size={18} aria-hidden />
        <input
          data-autofocus
          role="combobox"
          aria-label="Search projects, tasks and actions"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
          aria-autocomplete="list"
          placeholder="Search projects, tasks and actions"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Results" className="palette__list">
        {items.length === 0 && <li className="palette__empty">Nothing matches “{query}”.</li>}
        {items.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null
          lastGroup = item.group
          return (
            <li key={item.id} role="presentation">
              {header && <div className="palette__group" aria-hidden>{header}</div>}
              <div
                id={`${listId}-${item.id}`}
                role="option"
                aria-selected={i === active}
                className="palette__item"
                onMouseMove={() => setCursor(i)}
                onClick={() => run(item)}
              >
                <span className="palette__icon" aria-hidden>{item.icon}</span>
                <span className="palette__label">{item.label}</span>
                {item.hint && <span className="palette__hint">{item.hint}</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
