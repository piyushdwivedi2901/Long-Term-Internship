import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '../../shared/schemas.ts'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Logo } from '../ui/Logo.tsx'

const useFrom = () => ((useLocation().state as { from?: string } | null)?.from ?? '/')

/** The sign-in page's one moment: a receipt that splits itself. */
function SplitReceipt() {
  const rows: [string, string][] = [['Villa, 3 nights', '₹24,000'], ['Seafood dinner', '₹4,860'], ['Scooters', '₹2,400']]
  const people: [string, string, string][] = [['A', 'Aisha', '+₹9,830'], ['R', 'Rohan', '−₹4,170'], ['M', 'Meera', '−₹5,660']]
  return (
    <div className="receipt-art" aria-hidden>
      <div className="receipt-art__paper">
        <p className="receipt-art__title">Goa trip</p>
        {rows.map(([a, b], i) => (
          <p key={a} className="receipt-art__row" style={{ animationDelay: `${0.15 + i * 0.12}s` }}><span>{a}</span><span>{b}</span></p>
        ))}
        <p className="receipt-art__total"><span>Total</span><span>₹31,260</span></p>
        <div className="receipt-art__people">
          {people.map(([i, n, v], k) => (
            <span key={n} className={`receipt-art__person ${v.startsWith('+') ? 'is-pos' : 'is-neg'}`} style={{ animationDelay: `${0.7 + k * 0.15}s` }}>
              <span className="receipt-art__avatar">{i}</span>{n}<strong>{v}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function AuthLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const { status } = useAuth()
  const from = useFrom()
  if (status === 'signed-in') return <Navigate to={from} replace />
  return (
    <div className="auth">
      <section className="auth__side" aria-hidden>
        <div className="brand brand--light"><Logo /><span>Fairshare</span></div>
        <h2 className="auth__headline">Split the bill.<br />Keep the friends.</h2>
        <SplitReceipt />
        <p className="auth__sub">Trips, flats, dinners — add what anyone paid and Fairshare works out who owes whom, in the fewest payments.</p>
      </section>
      <main className="auth__main">
        <div className="auth__card">
          <div className="brand auth__mobile-brand"><Logo /><span>Fairshare</span></div>
          <h1>{title}</h1>
          <p className="muted">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  )
}

function DemoButton() {
  const { tryDemo } = useAuth()
  const navigate = useNavigate()
  const from = useFrom()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="auth__demo">
      <Button
        busy={busy}
        className="button--block"
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await tryDemo()
            navigate(from, { replace: true })
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        Explore with sample groups
      </Button>
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  )
}

function applyErrors(err: unknown, setError: (k: string, v: { message: string }) => void) {
  if (err instanceof ApiError && err.fields) for (const [k, m] of Object.entries(err.fields)) setError(k, { message: m })
  else setError('root', { message: (err as Error).message })
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const from = useFrom()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await signIn(v)
      navigate(from, { replace: true })
    } catch (e) {
      applyErrors(e, setError as never)
    }
  })
  return (
    <AuthLayout title="Sign in" intro="See who owes what.">
      <title>Sign in · Fairshare</title>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" autoFocus {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
        <Button type="submit" variant="primary" busy={isSubmitting} className="button--block">Sign in</Button>
      </form>
      <DemoButton />
      <p className="auth__switch">New here? <Link to="/signup" state={{ from }}>Create an account</Link></p>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const from = useFrom()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema), defaultValues: { name: '', email: '', password: '' } })
  const onSubmit = handleSubmit(async (v) => {
    try {
      await signUp(v)
      navigate(from, { replace: true })
    } catch (e) {
      applyErrors(e, setError as never)
    }
  })
  return (
    <AuthLayout title="Create your account" intro="Free, and it takes a few seconds.">
      <title>Create account · Fairshare</title>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Your name" hint="This is how friends will see you in groups" error={errors.name?.message}>
          <input autoComplete="name" autoFocus {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        {errors.root && <p className="form-error" role="alert">{errors.root.message}</p>}
        <Button type="submit" variant="primary" busy={isSubmitting} className="button--block">Create account</Button>
      </form>
      <p className="auth__switch">Already have an account? <Link to="/login" state={{ from }}>Sign in</Link></p>
    </AuthLayout>
  )
}
