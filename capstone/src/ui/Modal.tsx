import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cx } from '../lib/cx.ts'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Accessible name when the visible title isn't plain text. */
  label?: string
  children: ReactNode
  footer?: ReactNode
  variant?: 'dialog' | 'drawer'
  size?: 'sm' | 'md' | 'lg'
  initialFocus?: RefObject<HTMLElement | null>
}

/**
 * Accessible dialog rendered in a portal: focus moves in, is trapped, and
 * returns to the opener; Escape and backdrop clicks close it; page scroll is
 * locked. `drawer` slides in from the right (used for task details).
 */
export function Modal({ open, ...props }: ModalProps) {
  return createPortal(<AnimatePresence>{open && <ModalInner {...props} />}</AnimatePresence>, document.body)
}

function ModalInner({ onClose, title, label, children, footer, variant = 'dialog', size = 'md', initialFocus }: Omit<ModalProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const el = ref.current!
    ;(initialFocus?.current ?? el.querySelector<HTMLElement>('[data-autofocus]') ?? el).focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      // Restore focus only if it is still inside the (closing) dialog or lost.
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

  const drawer = variant === 'drawer'
  return (
    <motion.div
      className={cx('overlay', drawer && 'overlay--drawer')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => e.target === e.currentTarget && close.current()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={label ? undefined : titleId}
        aria-label={label}
        tabIndex={-1}
        className={cx('dialog', `dialog--${size}`, drawer && 'dialog--drawer')}
        onKeyDown={onKeyDown}
        initial={drawer ? { x: 40, opacity: 0 } : { y: 12, opacity: 0, scale: 0.98 }}
        animate={drawer ? { x: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
        exit={drawer ? { x: 40, opacity: 0 } : { y: 8, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 520, damping: 40 }}
      >
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">{title}</h2>
          <button type="button" className="icon-button" onClick={() => close.current()} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__footer">{footer}</div>}
      </motion.div>
    </motion.div>
  )
}
