import { useState } from 'react'

/**
 * Day 9 — Task 18: Form Validation
 * Goal: Signup form with validation (required fields, email format,
 * password match) — implemented manually (no external library) so the
 * validation logic itself is transparent.
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

export default function Task18_FormValidation() {
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate(values)
    setErrors(validationErrors)
    setSubmitted(Object.keys(validationErrors).length === 0)
  }

  const fields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'password', label: 'Password', type: 'password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
  ]

  return (
    <div className="task-section">
      <h2>Task 18: Form Validation</h2>
      {submitted && <p className="success-text">✅ Account created successfully!</p>}
      <form onSubmit={handleSubmit} noValidate className="simple-form">
        {fields.map((f) => (
          <div className="field-row" key={f.name}>
            <label htmlFor={f.name}>{f.label}</label>
            <input
              id={f.name}
              name={f.name}
              type={f.type}
              value={values[f.name]}
              onChange={handleChange}
            />
            {errors[f.name] && <span className="field-error">{errors[f.name]}</span>}
          </div>
        ))}
        <button type="submit">Sign up</button>
      </form>
    </div>
  )
}
