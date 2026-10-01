import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Renders children only for signed-in users. Anonymous visitors are sent to
 * /login and returned to the page they wanted afterwards.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <p className="empty-state" role="status">Checking your session…</p>
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
