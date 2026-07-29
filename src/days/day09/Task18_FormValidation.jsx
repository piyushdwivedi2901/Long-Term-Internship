import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

/**
 * Day 9 — Task 18: Form Validation
 * Goal: Signup form with validation (required fields, email format,
 * password match) — implemented manually (no external library) so the
 * validation logic itself is transparent.
 *
 * Extended with a live password-strength meter (length, casing, digits,
 * symbols scored independently of the pass/fail validation) and inline
 * valid/invalid icons per field as you type, not just on submit.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Name is required'
  if (!values.email.trim()) {
    errors.email = 'Email is required'
  } else if (!EMAIL_RE.test(values.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!values.password) {
    errors.password = 'Password is required'
  } else if (values.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match'
  }
  return errors
}

function scorePassword(pw) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0-5
}

const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
const STRENGTH_COLORS = ['var(--danger)', 'var(--danger)', 'var(--accent)', 'var(--accent-strong)', 'var(--done)', 'var(--done)']

export default function Task18_FormValidation() {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    setTouched((t) => ({ ...t, [name]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    setSubmitted(Object.keys(validationErrors).length === 0)
  }

  const strength = useMemo(() => scorePassword(values.password), [values.password])
  const liveValid = useMemo(() => validate(values), [values])

  const fields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'password', label: 'Password', type: 'password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
  ]

  return (
    <div className="task-section">
      <p className="task-eyebrow">Form Validation</p>
      <h2>Form Validation</h2>
      <p className="task-goal">Manual validation — required fields, email format, password match — plus a live strength meter, so the rules stay fully visible rather than hidden in a library.</p>
      {submitted && <p className="success-text">✅ Account created successfully!</p>}
      <form onSubmit={handleSubmit} noValidate className="simple-form">
        {fields.map((f) => {
          const isTouched = touched[f.name]
          const hasError = errors[f.name]
          const isValidNow = isTouched && !liveValid[f.name]
          return (
            <div key={f.name}>
              <div className="field-row">
                <label htmlFor={f.name}>{f.label}</label>
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type}
                  value={values[f.name]}
                  onChange={handleChange}
                />
                {isTouched && (isValidNow
                  ? <CheckCircle2 size={15} color="var(--done)" />
                  : <XCircle size={15} color="var(--danger)" />)}
              </div>
              {f.name === 'password' && values.password && (
                <div style={{ marginBottom: 10, marginLeft: 160, maxWidth: 260 }}>
                  <div className="form-strength-track">
                    <div className="form-strength-fill" style={{ width: `${(strength / 5) * 100}%`, background: STRENGTH_COLORS[strength] }} />
                  </div>
                  <span className="hint" style={{ color: STRENGTH_COLORS[strength] }}>{STRENGTH_LABELS[strength]}</span>
                </div>
              )}
              {hasError && <span className="field-error" style={{ marginLeft: 160, display: 'block', marginBottom: 8 }}>{hasError}</span>}
            </div>
          )
        })}
        <button className="primary" type="submit">Sign up</button>
      </form>
    </div>
  )
}
