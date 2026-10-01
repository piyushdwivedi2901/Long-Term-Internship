import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div id="app-root" style={{ overflow: 'hidden' }}>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal
        open={open}
        onClose={() => {
          onClose?.()
          setOpen(false)
        }}
        title="Your cart"
        footer={<button>Checkout</button>}
      >
        <input aria-label="Coupon" />
      </Modal>
    </div>
  )
}

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('portals into document.body, outside the app root', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    const dialog = screen.getByRole('dialog', { name: 'Your cart' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.getElementById('app-root')!.contains(dialog)).toBe(false)
    expect(document.body.contains(dialog)).toBe(true)
  })

  it('moves focus into the dialog and restores it to the trigger on close', async () => {
    render(<Harness />)
    const trigger = screen.getByText('Open')
    await userEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    // close, coupon, checkout
    await userEvent.tab()
    expect(screen.getByLabelText('Coupon')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByText('Checkout')).toHaveFocus()
    await userEvent.tab() // wraps
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    await userEvent.tab({ shift: true }) // wraps backwards
    expect(screen.getByText('Checkout')).toHaveFocus()
  })

  it('closes on backdrop click but not on dialog click', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.click(screen.getByText('Open'))
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(document.querySelector('.modal-backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks page scroll only while open', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Open'))
    expect(document.body.style.overflow).toBe('hidden')
    await userEvent.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })
})
