import { useRef, type ReactNode } from 'react'
import { Modal } from './Modal.tsx'
import { Button } from './Button.tsx'

export function ConfirmDialog(props: { open: boolean; title: string; children: ReactNode; confirmLabel: string; busy?: boolean; onConfirm(): void; onCancel(): void }) {
  const cancel = useRef<HTMLButtonElement>(null)
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title={props.title}
      size="sm"
      initialFocus={cancel}
      footer={
        <>
          <Button ref={cancel} onClick={props.onCancel}>Cancel</Button>
          <Button variant="danger" busy={props.busy} onClick={props.onConfirm}>{props.confirmLabel}</Button>
        </>
      }
    >
      <div className="prose">{props.children}</div>
    </Modal>
  )
}
