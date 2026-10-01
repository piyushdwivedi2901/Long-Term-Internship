import { Suspense, useRef, useState } from 'react'
import { ShieldCheck, Play } from 'lucide-react'
import Kanban from '../day12/Task23_KanbanBoard.jsx'
import Cart from '../day10/Task20_EcommerceCart.jsx'
import Shop from './Task32_Portals'

const FINDINGS = [
  {
    component: 'Kanban board',
    issue: 'Cards could only be moved by mouse drag — no keyboard or screen-reader path.',
    wcag: '2.1.1 Keyboard',
    fix: 'Cards are focusable; ← / → (or the Move buttons) change column, focus follows the card.',
  },
  {
    component: 'Kanban board',
    issue: 'Moves and adds were silent for screen-reader users.',
    wcag: '4.1.3 Status Messages',
    fix: 'A polite aria-live region announces every move, add and edge case.',
  },
  {
    component: 'Kanban board',
    issue: 'Add-card inputs had only a placeholder; headings jumped h2 → h4.',
    wcag: '1.3.1 / 3.3.2',
    fix: 'aria-labels on inputs, columns are labelled sections, headings are h3.',
  },
  {
    component: 'Cart',
    issue: 'Quantity and coupon inputs were unlabelled; coupon errors and totals updated silently.',
    wcag: '1.3.1 / 4.1.3',
    fix: 'Labelled inputs, role="alert" for errors, role="status" on the order summary.',
  },
  {
    component: 'Cart modal',
    issue: 'A dialog needs a focus trap, Escape to close and focus restoration.',
    wcag: '2.4.3 Focus Order',
    fix: 'Focus moves in, Tab/Shift+Tab wrap, Escape closes, focus returns to the trigger.',
  },
]

interface Violation {
  id: string
  impact?: string | null
  help: string
  nodes: { target: unknown[] }[]
}

// axe-core is ~500 kB, so it is only fetched when the audit is actually run.
const loadAxe = () => import('axe-core')

function AuditPanel() {
  const target = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [violations, setViolations] = useState<Violation[]>([])
  const [passes, setPasses] = useState(0)

  const run = async () => {
    setState('running')
    try {
      const axe = (await loadAxe()).default
      const result = await axe.run(target.current!)
      setViolations(result.violations as Violation[])
      setPasses(result.passes.length)
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="primary" onClick={run} disabled={state === 'running'}>
          <Play size={13} className="icon-inline" aria-hidden="true" />
          {state === 'running' ? 'Auditing…' : 'Run axe audit on the 3 components'}
        </button>
        <span className="hint" role="status">
          {state === 'done' &&
            (violations.length === 0
              ? `✓ 0 violations · ${passes} rules passed`
              : `${violations.length} violation(s) · ${passes} rules passed`)}
          {state === 'error' && 'Audit failed to run.'}
        </span>
      </div>
      {violations.length > 0 && (
        <ul className="audit-violations">
          {violations.map((v) => (
            <li key={v.id}>
              <strong>{v.id}</strong> ({v.impact}) — {v.help}
              <br />
              <code>{v.nodes.map((n) => n.target.join(' ')).join(', ')}</code>
            </li>
          ))}
        </ul>
      )}
      <div ref={target} className="audit-target">
        <Kanban />
        <Cart />
        <Shop />
      </div>
    </>
  )
}

export default function Task33_AccessibilityPass() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Inclusive design</p>
      <h2>Accessibility Pass</h2>
      <p className="task-goal">
        Three components audited with axe-core (the engine behind axe DevTools) plus manual keyboard
        testing: the Kanban board, the cart and the cart modal. Findings, fixes, and a button that
        re-runs the audit live against the real components below.
      </p>

      <h3><ShieldCheck size={15} className="icon-inline" aria-hidden="true" />Findings &amp; fixes</h3>
      <div className="table-wrap">
        <table className="audit-table">
          <thead>
            <tr><th>Component</th><th>Problem</th><th>WCAG</th><th>Fix</th></tr>
          </thead>
          <tbody>
            {FINDINGS.map((f) => (
              <tr key={f.issue}>
                <td>{f.component}</td>
                <td>{f.issue}</td>
                <td>{f.wcag}</td>
                <td>{f.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Live audit</h3>
      <Suspense fallback={null}>
        <AuditPanel />
      </Suspense>
    </div>
  )
}
