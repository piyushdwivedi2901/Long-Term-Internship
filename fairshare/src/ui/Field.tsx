import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'
import { cx } from '../lib/cx.ts'

interface FieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  children: ReactElement<Record<string, unknown>>
  className?: string
}

/** Label + control + hint/error, with the aria wiring done once. */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('field', error && 'field--invalid', className)}>
      <label htmlFor={id} className="field__label">{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && !error && <p id={hintId} className="field__hint">{hint}</p>}
      {error && <p id={errorId} className="field__error" role="alert">{error}</p>}
    </div>
  )
}
