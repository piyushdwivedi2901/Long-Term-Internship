import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useUi } from '../lib/uiStore.ts'

const ICON = { info: Info, success: CircleCheck, error: CircleAlert }

export function Toaster() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      <div aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICON[t.tone]
          return (
            <div key={t.id} className={`toast toast--${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={16} aria-hidden />
              <span>{t.message}</span>
              <button type="button" className="icon-btn icon-btn--sm" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>
                <X size={14} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
