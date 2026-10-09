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

/** The sign-in page's one moment: a TV scoreboard and a live table. */
function Broadcast() {
  const table: [string, number, number, string][] = [
    ['Rohan', 1, 1084, '#2d7ff9'],
    ['You', 2, 1052, '#e4572e'],
    ['Aisha', 3, 1019, '#20bf55'],
  ]
  return (
    <div className="broadcast" aria-hidden>
      <div className="scorebug">
        <span className="scorebug__team" style={{ ['--kit' as string]: '#e4572e' }}>
          <span className="scorebug__code">YOU</span>
          <span className="scorebug__club">RMA</span>
        </span>
        <span className="scorebug__score">
          <span>3</span>
          <span className="scorebug__sep">–</span>
          <span>2</span>
        </span>
        <span className="scorebug__team scorebug__team--away" style={{ ['--kit' as string]: '#2d7ff9' }}>
          <span className="scorebug__code">ROH</span>
          <span className="scorebug__club">MCI</span>
        </span>
        <span className="scorebug__time">FT · Diwali Cup semi-final</span>
      </div>
      <ol className="mini-table">
        {table.map(([name, pos, rating, color], i) => (
          <li key={name} style={{ animationDelay: `${0.5 + i * 0.12}s`, ['--kit' as string]: color }}>
            <span className="mini-table__pos">{pos}</span>
            <span className="mini-table__kit" />
            <span className="mini-table__name">{name}</span>
            <span className="mini-table__rating">{rating}</span>
          </li>
        ))}
      </ol>
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
        <div className="brand brand--light"><Logo /><span>Couch Cup</span></div>
        <h2 className="auth__headline">Your crew.<br />Your league.<br />Your bragging rights.</h2>
        <Broadcast />
        <p className="auth__sub">Leagues and knockout cups for the friends you play EA FC with. Live tables, brackets, ratings and head-to-heads — so the argument is settled by numbers.</p>
      </section>
      <main className="auth__main">
        <div className="auth__card">
          <div className="brand auth__mobile-brand"><Logo /><span>Couch Cup</span></div>
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
        Explore with a sample crew
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
    <AuthLayout title="Sign in" intro="The table is waiting.">
      <title>Sign in · Couch Cup</title>
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
      <title>Create account · Couch Cup</title>
      <form className="stack" onSubmit={onSubmit} noValidate>
        <Field label="Your name" hint="Shown on tables and scoreboards" error={errors.name?.message}>
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
