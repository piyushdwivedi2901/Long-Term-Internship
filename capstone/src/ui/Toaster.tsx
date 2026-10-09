import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useUi } from '../lib/uiStore.ts'

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert }

/** Toasts live in a polite live region so screen readers hear them too. */
export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)
  return (
    <div className="toaster" role="region" aria-label="Notifications">
      <div aria-live="polite" aria-atomic="false">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone]
            return (
              <motion.div
                key={t.id}
                layout
                className={`toast toast--${t.tone}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                role={t.tone === 'error' ? 'alert' : 'status'}
              >
                <Icon size={16} aria-hidden />
                <span className="toast__message">{t.message}</span>
                {t.action && (
                  <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      t.action!.run()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" className="icon-button icon-button--sm" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                  <X size={14} aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
