import type { ComponentProps, ReactNode } from 'react'
import { cx } from '../lib/cx.ts'
import { Spinner } from './Spinner.tsx'

interface Props extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  busy?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, busy, children, className, disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx('button', `button--${variant}`, size === 'sm' && 'button--sm', className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <Spinner size={14} /> : icon}
      {children && <span>{children}</span>}
    </button>
  )
}
