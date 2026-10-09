import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.tsx'
import { Avatar } from '../ui/bits.tsx'

/** Disclosure menu with arrow-key navigation (menu button pattern). */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const items = [
    { label: 'Settings', icon: Settings, run: () => navigate('/settings') },
    { label: 'Sign out', icon: LogOut, run: signOut },
  ]

  return (
    <div className="user-menu" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="user-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={user?.name ?? ''} size={30} />
        <span className="sr-only">Account menu for {user?.name}</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="menu"
          onKeyDown={(e) => {
            const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
            const i = nodes.indexOf(document.activeElement as HTMLElement)
            if (e.key === 'ArrowDown') nodes[(i + 1) % nodes.length].focus()
            else if (e.key === 'ArrowUp') nodes[(i - 1 + nodes.length) % nodes.length].focus()
            else if (e.key === 'Escape' || e.key === 'Tab') {
              setOpen(false)
              if (e.key === 'Escape') button.current?.focus()
              return
            } else return
            e.preventDefault()
          }}
        >
          <div className="menu__header">
            <strong>{user?.name}</strong>
            <span className="muted small">{user?.email}</span>
          </div>
          {items.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="menu__item"
              onClick={() => {
                setOpen(false)
                run()
              }}
            >
              <Icon size={16} aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
