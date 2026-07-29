import { useState } from 'react'

/**
 * Day 4 — Task 7: Simple Form
 * Goal: Controlled input fields (name, email) with onChange,
 * displaying the values live as you type.
 */
export default function Task7_SimpleForm() {
  const [form, setForm] = useState({ name: '', email: '' })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="task-section">
      <p className="task-eyebrow">Controlled Inputs</p>
      <h2>Simple Form</h2>
      <p className="task-goal">Two controlled fields, both driven by one <code>onChange</code> handler and mirrored live below as you type.</p>
      <form onSubmit={(e) => e.preventDefault()} className="simple-form">
        <div className="field-row">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} />
        </div>
        <div className="field-row">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
        </div>
      </form>
      <div className="live-preview">
        <p>Live preview:</p>
        <p>Name: {form.name || <em>(empty)</em>}</p>
        <p>Email: {form.email || <em>(empty)</em>}</p>
      </div>
    </div>
  )
}
