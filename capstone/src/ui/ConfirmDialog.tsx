import { useRef, type ReactNode } from 'react'
import { Modal } from './Modal.tsx'
import { Button } from './Button.tsx'

interface Props {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Destructive-action confirmation. Focus starts on Cancel, the safe choice. */
export function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      initialFocus={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} onClick={onCancel}>Cancel</Button>
          <Button variant="danger" busy={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="prose">{children}</div>
    </Modal>
  )
}
