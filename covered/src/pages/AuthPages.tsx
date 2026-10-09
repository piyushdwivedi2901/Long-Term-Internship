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

/** The sign-in page's one moment: a bill gets stamped. */
function StampedBill() {
  const others: [string, string, string][] = [
    ['Refrigerator', 'Compressor until 2034', 'partial'],
    ['Phone', 'Until Mar 2028', 'covered'],
    ['Water purifier', 'Ended Apr 2025', 'expired'],
  ]
  return (
    <div className="bill-art" aria-hidden>
      <div className="bill-art__paper">
        <p className="bill-art__store">BRIGHTLINE · INVOICE</p>
        <p className="bill-art__row"><span>Voltas 1.5 T inverter AC</span><span>₹42,990</span></p>
        <p className="bill-art__row bill-art__row--muted"><span>S/N VTS185VX5521</span><span>3 Nov 2025</span></p>
        <p className="bill-art__row bill-art__row--muted"><span>Warranty 1 yr · compressor 5 yrs</span><span></span></p>
        <span className="stamp stamp--covered bill-art__stamp">
          <span className="stamp__word">Covered</span>
          <span className="stamp__sub">until 2 Nov 2026</span>
        </span>
      </div>
      <ul className="bill-art__list">
        {others.map(([name, note, status], i) => (
          <li key={name} style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
            <span className={`pill pill--${status}`}><span className="pill__dot" /></span>
            <strong>{name}</strong>
            <span>{note}</span>
          </li>
        ))}
      </ul>
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
        <div className="brand brand--light"><Logo /><span>Covered</span></div>
        <h2 className="auth__headline">Is it still under warranty?<br />Know in a second.</h2>
        <StampedBill />
        <p className="auth__sub">Every bill, every warranty and every repair in one place. Covered warns you before cover runs out — and hands you everything a service centre asks for.</p>
      </section>
      <main className="auth__main">
        <div className="auth__card">
          <div className="brand auth__mobile-brand"><Logo /><span>Covered</span></div>
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
        Explore with sample items
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
    <AuthLayout title="Sign in" intro="Your bills and warranties are waiting.">
      <title>Sign in · Covered</title>
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
      <title>Create account · Covered</title>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Your name" hint="Used to sign claim messages to service centres" error={errors.name?.message}>
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
