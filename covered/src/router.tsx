import { lazy, Suspense } from 'react'
import { Navigate, Outlet, createHashRouter, useLocation, useRouteError } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.tsx'
import { LoginPage, SignupPage } from './pages/AuthPages.tsx'
import { Button } from './ui/Button.tsx'
import { PageLoading } from './ui/Spinner.tsx'

// Only the sign-in screens ship in the entry bundle; everything else is a chunk.
const Layout = lazy(() => import('./features/Layout.tsx').then((m) => ({ default: m.Layout })))
const HomePage = lazy(() => import('./pages/HomePage.tsx'))
const ItemsPage = lazy(() => import('./pages/ItemsPage.tsx'))
const ItemPage = lazy(() => import('./pages/ItemPage.tsx'))
const ItemEditPage = lazy(() => import('./pages/ItemEditPage.tsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.tsx'))

function RequireAuth() {
  const { status, signedOutByUser } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <PageLoading label="Restoring your session" />
  if (status === 'signed-out') return <Navigate to="/login" replace state={signedOutByUser ? undefined : { from: location.pathname + location.search }} />
  return (
    <Suspense fallback={<PageLoading label="Loading Covered" />}>
      <Outlet />
    </Suspense>
  )
}

function RouteError() {
  const error = useRouteError() as Error
  return (
    <div className="crash crash--page" role="alert">
      <h1>Something went wrong</h1>
      <p>{error?.message ?? 'Unknown error'}</p>
      <Button variant="primary" onClick={() => location.assign(location.pathname)}>Reload Covered</Button>
    </div>
  )
}

/** Hash routes so deep links work on static hosting. */
export const createRouter = () =>
  createHashRouter([
    { path: '/login', element: <LoginPage /> },
    { path: '/signup', element: <SignupPage /> },
    {
      path: '/',
      element: <RequireAuth />,
      errorElement: <RouteError />,
      children: [
        {
          element: <Layout />,
          children: [
            { index: true, element: <HomePage /> },
            { path: 'items', element: <ItemsPage /> },
            { path: 'items/new', element: <ItemEditPage /> },
            { path: 'items/:itemId', element: <ItemPage /> },
            { path: 'items/:itemId/edit', element: <ItemEditPage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ])
