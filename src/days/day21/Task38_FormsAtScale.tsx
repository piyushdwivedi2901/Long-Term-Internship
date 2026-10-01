import { Profiler, useRef, type ProfilerOnRenderCallback, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import Task18_FormValidation from '../day09/Task18_FormValidation.jsx'
import { signupSchema, type SignupValues } from './signupSchema'

/**
 * Task 38 — Forms at scale
 * The Task 18 signup form rebuilt with React Hook Form + Zod, shown next to
 * the original manual version with a measured comparison.
 *
 * Differences worth noticing:
 *  - RHF keeps inputs *uncontrolled*: typing doesn't re-render the form, only
 *    the fields whose error state changes. The manual form re-renders on
 *    every keystroke (the Profiler counters below make that visible).
 *  - Validation lives in a declarative schema, shared with the type system.
 */
const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password' },
] as const

export function RhfSignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched', // validate when a field is left, then live as it's corrected
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: SignupValues) => {
    // A real app would POST `values` here; the schema guarantees its shape.
    await Promise.resolve(values)
  }

  return (
    <>
      {isSubmitSuccessful && <p className="success-text" role="status">✅ Account created successfully!</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="simple-form" aria-label="Signup (React Hook Form + Zod)">
        {FIELDS.map((f) => {
          const error = errors[f.name]?.message
          return (
            <div key={f.name}>
              <div className="field-row">
                <label htmlFor={`rhf-${f.name}`}>{f.label}</label>
                <input
                  id={`rhf-${f.name}`}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `rhf-${f.name}-error` : undefined}
                  {...register(f.name)}
                />
              </div>
              {error && (
                <span id={`rhf-${f.name}-error`} className="field-error" role="alert" style={{ display: 'block', marginBottom: 8 }}>
                  {error}
                </span>
              )}
            </div>
          )
        })}
        <button className="primary" type="submit" disabled={isSubmitting}>Sign up</button>
      </form>
    </>
  )
}

/**
 * Counts commits of everything inside it. The count is written straight to
 * the DOM (not React state): setting state in the Profiler callback would
 * re-render the subtree being measured and loop forever.
 */
function Counted({ id, testId, children }: { id: string; testId: string; children: ReactNode }) {
  const out = useRef<HTMLElement>(null)
  const count = useRef(0)
  const onRender: ProfilerOnRenderCallback = () => {
    count.current += 1
    if (out.current) out.current.textContent = String(count.current)
  }
  const reset = () => {
    count.current = 0
    if (out.current) out.current.textContent = '0'
  }
  return (
    <>
      <p className="result-count">
        Renders: <strong ref={out} data-testid={testId}>0</strong>{' '}
        <button type="button" className="icon-btn" onClick={reset}>reset</button>
      </p>
      <Profiler id={id} onRender={onRender}>{children}</Profiler>
    </>
  )
}

const COMPARISON = [
  ['Validation rules', 'Hand-written validate() function', 'Declarative Zod schema (also the TypeScript type)'],
  ['Form state', 'useState for values, errors, touched, submitted', 'Handled by the library (formState)'],
  ['Re-renders while typing', 'Whole form on every keystroke', 'None — inputs are uncontrolled'],
  ['Lines of form code (this repo)', '120 (Task 18, incl. strength meter)', '48 form + 28 schema (no strength meter)'],
  ['Added bundle weight (measured)', '0 kB', '≈ +36 kB gzip (react-hook-form + zod + resolver)'],
  ['Custom UX (strength meter, icons)', 'Trivial — you own all state', 'Possible via watch(), a little more wiring'],
] as const

export default function Task38_FormsAtScale() {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Forms</p>
      <h2>Forms at Scale</h2>
      <p className="task-goal">
        The signup form rebuilt with React Hook Form + Zod, beside the manual version from Task 18.
        Type in each and watch the render counters.
      </p>

      <div className="anim-grid">
        <section aria-labelledby="t38-manual">
          <h3 id="t38-manual">Manual (Task 18)</h3>
          <Counted id="manual" testId="t38-manual-renders">
            <Task18_FormValidation />
          </Counted>
        </section>

        <section aria-labelledby="t38-rhf">
          <h3 id="t38-rhf"><CheckCircle2 size={14} className="icon-inline" aria-hidden="true" />React Hook Form + Zod</h3>
          <Counted id="rhf" testId="t38-rhf-renders">
            <RhfSignupForm />
          </Counted>
        </section>
      </div>

      <h3>Comparison</h3>
      <div className="table-wrap">
        <table className="audit-table">
          <thead><tr><th>Aspect</th><th>Manual</th><th>RHF + Zod</th></tr></thead>
          <tbody>
            {COMPARISON.map(([aspect, manual, rhf]) => (
              <tr key={aspect}><td>{aspect}</td><td>{manual}</td><td>{rhf}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Takeaway: for one small form the manual approach is perfectly fine and clearer; once there are many
        forms, nested or dynamic fields, or shared server/client validation, RHF + Zod pays for itself.
      </p>
    </div>
  )
}
