import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '../../shared/schemas.ts'
import { ApiError } from '../api/types.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { Button } from '../ui/Button.tsx'
import { Field } from '../ui/Field.tsx'
import { Logo } from '../ui/Logo.tsx'

function useRedirectTarget() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/'
}

/**
 * The one orchestrated motion moment: three lines draw in on the sign-in page.
 * Pure CSS (stroke-dashoffset), so the sign-in bundle doesn't need an
 * animation library; reduced-motion users get the finished drawing.
 */
function RouteMap() {
  const lines = [
    { d: 'M20 250 C 120 250, 140 120, 240 120 S 380 60, 470 60', cls: 'line--blue', stops: [[20, 250], [240, 120], [470, 60]] },
    { d: 'M20 300 C 160 300, 200 210, 300 210 S 400 180, 470 180', cls: 'line--teal', stops: [[20, 300], [300, 210], [470, 180]] },
    { d: 'M20 150 C 100 150, 150 280, 260 280 S 420 300, 470 300', cls: 'line--amber', stops: [[20, 150], [260, 280], [470, 300]] },
  ]
  return (
    <svg viewBox="0 0 490 360" className="route-map" aria-hidden>
      {lines.map((l, i) => (
        <g key={l.cls} className={l.cls}>
          <path d={l.d} pathLength={1} className="route-map__line" style={{ animationDelay: `${0.25 * i}s` }} />
          {l.stops.map(([x, y], j) => (
            <circle
              key={j}
              cx={x}
              cy={y}
              r={j === 2 ? 9 : 6}
              className={j === 2 ? 'route-map__end' : 'route-map__stop'}
              style={{ animationDelay: `${0.25 * i + 0.45 * j + 0.2}s` }}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

function AuthLayout({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const { status } = useAuth()
  const to = useRedirectTarget()
  if (status === 'signed-in') return <Navigate to={to} replace />
  return (
    <div className="auth">
      <section className="auth__aside" aria-hidden>
        <div className="auth__brand">
          <Logo size={30} />
          <span>Flowboard</span>
        </div>
        <RouteMap />
        <p className="auth__pitch">Every project is a line. Every task is a stop on the way to done.</p>
      </section>
      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__brand auth__brand--mobile">
            <Logo size={28} />
            <span>Flowboard</span>
          </div>
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
  const to = useRedirectTarget()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="auth__demo">
      <Button
        busy={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            await tryDemo()
            navigate(to, { replace: true })
          } catch (e) {
            setError((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        Explore with sample data
      </Button>
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  )
}

const applyServerErrors = <T extends object>(err: unknown, setError: (k: keyof T | 'root', v: { message: string }) => void) => {
  if (err instanceof ApiError && err.fields) for (const [k, m] of Object.entries(err.fields)) setError(k as keyof T, { message: m })
  else setError('root', { message: (err as Error).message })
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const to = useRedirectTarget()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values)
      navigate(to, { replace: true })
    } catch (err) {
      applyServerErrors<LoginInput>(err, setError as never)
    }
  })

  return (
    <AuthLayout title="Sign in" intro="Pick up where you left off.">
      <form onSubmit={onSubmit} noValidate className="stack">
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
      <p className="auth__switch">
        New to Flowboard? <Link to="/signup" state={{ from: to }}>Create an account</Link>
      </p>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const to = useRedirectTarget()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values)
      navigate(to, { replace: true })
    } catch (err) {
      applyServerErrors<SignupInput>(err, setError as never)
    }
  })

  return (
    <AuthLayout title="Create your account" intro="It takes a few seconds. No credit card, no setup.">
      <form onSubmit={onSubmit} noValidate className="stack">
        <Field label="Name" error={errors.name?.message}>
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
      <p className="auth__switch">
        Already have an account? <Link to="/login" state={{ from: to }}>Sign in</Link>
      </p>
    </AuthLayout>
  )
}
