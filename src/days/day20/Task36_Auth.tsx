import { useState, type FormEvent } from 'react'
import { Link, MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, ShieldCheck, UserPlus } from 'lucide-react'
import { AuthProvider, useAuth } from '../../auth/AuthContext'
import { ProtectedRoute } from '../../auth/ProtectedRoute'
import { TodoApp } from '../day19/Task35_RealBackend'
import type { Api, TokenGetter } from '../../api'

/**
 * Task 36 — Auth
 * Email + password accounts. `/account` is a protected route that shows the
 * signed-in user's own todos. With the Express server, passwords are hashed
 * with scrypt and sessions are signed JWTs; in demo mode (static hosting) the
 * same flow runs against browser storage.
 */

function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const { login, signup, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectedFrom = (location.state as { from?: string } | null)?.from
  const from = redirectedFrom ?? '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  if (status === 'authenticated') return <Navigate to={from} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await (isSignup ? signup : login)(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="auth-form" noValidate>
      <h3>{isSignup ? 'Create an account' : 'Sign in'}</h3>
      {redirectedFrom && <p className="hint">Sign in to continue to <code>{from}</code>.</p>}
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {isSignup && <small className="hint">At least 8 characters.</small>}
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>
        {isSignup ? <UserPlus size={13} className="icon-inline" aria-hidden="true" /> : <LogIn size={13} className="icon-inline" aria-hidden="true" />}
        {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Sign in'}
      </button>
      <p className="hint">
        {isSignup ? <>Already registered? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/signup">Create an account</Link></>}
      </p>
    </form>
  )
}

function Account() {
  const { user, api } = useAuth()
  return (
    <div>
      <h3><ShieldCheck size={15} className="icon-inline" aria-hidden="true" />Your account</h3>
      <p>Signed in as <strong data-testid="t36-email">{user?.email}</strong></p>
      <p className="hint">These todos belong to you — other accounts can't see or change them.</p>
      <TodoApp api={api} />
    </div>
  )
}

function Shell() {
  const { status, user, logout } = useAuth()
  return (
    <>
      <nav className="router-nav" aria-label="Auth demo">
        <Link to="/">Home</Link>
        <Link to="/account">Account (protected)</Link>
        {status === 'authenticated' ? (
          <button type="button" onClick={logout} style={{ marginLeft: 'auto' }}>
            <LogOut size={13} className="icon-inline" aria-hidden="true" />Sign out ({user?.email})
          </button>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </nav>
      <div className="router-page">
        <Routes>
          <Route path="/" element={<p>Public page — anyone can see this. Try opening <em>Account</em> while signed out.</p>} />
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/signup" element={<AuthForm mode="signup" />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="*" element={<p>Not found.</p>} />
        </Routes>
      </div>
    </>
  )
}

interface Props {
  /** Test seam: inject an isolated API client. */
  createApiFn?: (getToken: TokenGetter) => Api
}

export default function Task36_Auth({ createApiFn }: Props) {
  return (
    <div className="task-section">
      <p className="task-eyebrow">Full stack</p>
      <h2>Auth</h2>
      <p className="task-goal">
        Sign up, sign in and out. The Account page is a protected route: signed-out visitors are
        redirected to the login form and brought back afterwards, and it shows only your own data.
      </p>
      <AuthProvider createApiFn={createApiFn}>
        <MemoryRouter>
          <Shell />
        </MemoryRouter>
      </AuthProvider>
    </div>
  )
}
