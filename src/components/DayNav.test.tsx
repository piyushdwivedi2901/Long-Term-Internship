import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DayNav } from './DayNav'
import { silenceBoundaryErrors } from '../test/silenceBoundaryErrors'

function Harness() {
  const [value, setValue] = useState('a')
  return (
    <DayNav value={value} onValueChange={setValue} aria-label="Tasks">
      <DayNav.Day label="Day 1" active>
        <DayNav.Item id="a" num={1} title="Alpha" />
        <DayNav.Item id="b" num={2} title="Beta" />
      </DayNav.Day>
      <DayNav.Day label="Day 2">
        <DayNav.Item id="c" num={3} title="Gamma" />
      </DayNav.Day>
    </DayNav>
  )
}

describe('DayNav', () => {
  it('renders zero-padded items and marks the selected one', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: '01 · Alpha' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '02 · Beta' })).not.toHaveAttribute('aria-current')
  })

  it('selects an item on click', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: '03 · Gamma' }))
    expect(screen.getByRole('button', { name: '03 · Gamma' })).toHaveAttribute('aria-current', 'page')
  })

  it('groups items under labelled days', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Day 2' })).toBeInTheDocument()
  })

  it('moves focus with arrow, Home and End keys (wrapping)', async () => {
    render(<Harness />)
    screen.getByRole('button', { name: '01 · Alpha' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: '02 · Beta' })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('button', { name: '03 · Gamma' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: '01 · Alpha' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('button', { name: '03 · Gamma' })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('button', { name: '01 · Alpha' })).toHaveFocus()
  })
})

describe('DayNav misuse', () => {
  silenceBoundaryErrors()
  it('throws a clear error when an Item is used outside <DayNav>', () => {
    expect(() => render(<DayNav.Item id="x" num={1} title="X" />)).toThrow(
      '<DayNav.Item> must be rendered inside <DayNav>',
    )
  })
})
