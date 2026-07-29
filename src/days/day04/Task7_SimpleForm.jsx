import { useMemo, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Day 4 — Task 7: Simple Form
 * Goal: Controlled input fields (name, email) with onChange,
 * displaying the values live as you type.
 *
 * Extended: a bio textarea with a live character counter, and a
 * lightweight "field completeness" checklist that updates as you type —
 * still just controlled inputs and derived values, no submission logic.
 */
export default function Task7_SimpleForm() {
  const [form, setForm] = useState({ name: '', email: '', bio: '' })
  const maxBio = 140

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value.slice(0, name === 'bio' ? maxBio : undefined) }))
  }

  const checks = useMemo(() => ([
    { label: 'Name filled in', done: form.name.trim().length > 0 },
    { label: 'Email looks valid', done: EMAIL_RE.test(form.email) },
    { label: 'Bio under the character limit', done: form.bio.length <= maxBio },
  ]), [form])

  return (
    <div className="task-section">
      <p className="task-eyebrow">Controlled Inputs</p>
      <h2>Simple Form</h2>
      <p className="task-goal">Three controlled fields driven by one <code>onChange</code> handler, mirrored live below as you type.</p>

      <form onSubmit={(e) => e.preventDefault()} className="simple-form">
        <div className="field-row">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div className="field-row">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
        </div>
        <div className="field-row" style={{ alignItems: 'flex-start' }}>
          <label htmlFor="bio" style={{ marginTop: 8 }}>Bio</label>
          <div>
            <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} rows={3} style={{ width: 260 }} />
            <p className="hint" style={{ margin: '4px 0 0' }}>{form.bio.length} / {maxBio}</p>
          </div>
        </div>
      </form>

      <div className="live-preview">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live preview</p>
        <p>Name: {form.name || <em>(empty)</em>}</p>
        <p>Email: {form.email || <em>(empty)</em>}</p>
        <p>Bio: {form.bio || <em>(empty)</em>}</p>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map((c) => (
          <li key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: c.done ? 'var(--done)' : 'var(--text-faint)' }}>
            {c.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
