import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal.tsx'

function TwoDialogs() {
  const [which, setWhich] = useState<'a' | 'b' | null>(null)
  return (
    <>
      <button onClick={() => setWhich('a')}>Open A</button>
      <button onClick={() => setWhich('b')}>Open B</button>
      <Modal open={which === 'a'} onClose={() => setWhich(null)} title="Dialog A">
        <button onClick={() => setWhich('b')}>Switch to B</button>
      </Modal>
      <Modal open={which === 'b'} onClose={() => setWhich(null)} title="Dialog B">
        <input data-autofocus aria-label="B field" />
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('returns focus to the opener when closed', async () => {
    const user = userEvent.setup()
    render(<TwoDialogs />)
    await user.click(screen.getByText('Open A'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('Open A')).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it("doesn't steal focus from a dialog that opened while another was closing (regression)", async () => {
    const user = userEvent.setup()
    render(<TwoDialogs />)
    await user.click(screen.getByText('Open A'))
    await user.click(screen.getByText('Switch to B'))
    const field = await screen.findByLabelText('B field')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Dialog A' })).toBeNull()) // A finished animating out
    expect(field).toHaveFocus()
    await user.type(field, 'typed after A closed')
    expect(field).toHaveValue('typed after A closed')
    expect(document.body.style.overflow).toBe('hidden') // B is still open
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.body.style.overflow).toBe('')) // released when the exit animation unmounts it
  })
})
