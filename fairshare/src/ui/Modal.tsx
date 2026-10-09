import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '../lib/cx.ts'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const EXIT_MS = 140

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** A bottom sheet on phones, a centered dialog elsewhere. */
  sheet?: boolean
  initialFocus?: RefObject<HTMLElement | null>
}

/**
 * Accessible dialog in a portal: focus moves in, is trapped, and returns to
 * the opener; Escape and backdrop clicks close it; page scroll is locked.
 * Enter/exit motion is plain CSS and is skipped under reduced motion.
 */
export function Modal({ open, ...rest }: ModalProps) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => setMounted(false), EXIT_MS)
      return () => clearTimeout(t)
    }
  }, [open, mounted])
  if (!mounted) return null
  return createPortal(<Inner {...rest} closing={closing} />, document.body)
}

function Inner({ onClose, title, description, children, footer, size = 'md', sheet, initialFocus, closing }: Omit<ModalProps, 'open'> & { closing: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ;(initialFocus?.current ?? ref.current!.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current!).focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      if (opener?.isConnected) opener.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close.current()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(ref.current!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement)
    if (!items.length) return e.preventDefault()
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={cx('scrim', closing && 'is-closing')} onMouseDown={(e) => e.target === e.currentTarget && close.current()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx('dialog', `dialog--${size}`, sheet && 'dialog--sheet')}
        onKeyDown={onKeyDown}
      >
        <div className="dialog__head">
          <div>
            <h2 id={titleId} className="dialog__title">{title}</h2>
            {description && <p id={descId} className="dialog__desc">{description}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => close.current()}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__foot">{footer}</div>}
      </div>
    </div>
  )
}
