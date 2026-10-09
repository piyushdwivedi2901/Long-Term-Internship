import { useEffect, useRef } from 'react'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * Global keyboard shortcut. `combo` is e.g. "mod+k" (Ctrl on Windows/Linux,
 * ⌘ on macOS) or a single key like "c". Single-key shortcuts are ignored while
 * the user is typing in a field.
 */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    const parts = combo.toLowerCase().split('+')
    const key = parts.pop()!
    const needsMod = parts.includes('mod')
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return
      const mod = e.metaKey || e.ctrlKey
      if (needsMod !== mod) return
      if (!needsMod && (e.altKey || isTyping(e.target))) return
      e.preventDefault()
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo, enabled])
}
