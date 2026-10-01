import { useState } from 'react'
import { DayNav } from '../../components/DayNav'

const SAMPLE = [
  { day: 'Day 1', items: [{ id: 'intro', title: 'Introduction' }, { id: 'setup', title: 'Setup' }] },
  { day: 'Day 2', items: [{ id: 'state', title: 'State' }] },
  { day: 'Day 3', items: [{ id: 'hooks', title: 'Hooks' }, { id: 'ship', title: 'Ship it' }] },
]

const SNIPPET = `<DayNav value={id} onValueChange={setId}>
  <DayNav.Day label="Day 1" active>
    <DayNav.Item id="intro" num={1} title="Introduction" />
  </DayNav.Day>
</DayNav>`

export default function Task31_CompoundComponents() {
  const [selected, setSelected] = useState('intro')
  let n = 0

  return (
    <section className="task-section">
      <p className="task-eyebrow">Component design</p>
      <h2>Compound Components</h2>
      <p className="task-goal">
        <code>DayNav</code> is built from cooperating parts — <code>DayNav.Day</code> and{' '}
        <code>DayNav.Item</code> — that share state through a Context private to the component.
        The same component drives this app's sidebar.
      </p>

      <div className="t31-demo">
        <div className="t31-nav">
          <DayNav value={selected} onValueChange={setSelected} aria-label="Sample course">
            {SAMPLE.map((d) => (
              <DayNav.Day key={d.day} label={d.day} active={d.items.some((it) => it.id === selected)}>
                {d.items.map((it) => (
                  <DayNav.Item key={it.id} id={it.id} num={++n} title={it.title} />
                ))}
              </DayNav.Day>
            ))}
          </DayNav>
        </div>
        <p>
          Selected: <strong data-testid="t31-selected">{selected}</strong>
        </p>
      </div>

      <h3>Usage</h3>
      <pre className="code-block">{SNIPPET}</pre>
      <ul>
        <li>Consumers compose the markup; layout is not hard-coded into one prop-heavy component.</li>
        <li>Using <code>DayNav.Item</code> outside <code>DayNav</code> throws a descriptive error.</li>
        <li>Arrow, Home and End keys move focus between items.</li>
      </ul>
    </section>
  )
}
