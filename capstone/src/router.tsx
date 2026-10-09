import { lazy, Suspense } from 'react'
import { Navigate, Outlet, createHashRouter, useLocation, useRouteError } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.tsx'
import { LoginPage, SignupPage } from './pages/AuthPages.tsx'
import { Button } from './ui/Button.tsx'
import { PageLoading } from './ui/Spinner.tsx'

// Each signed-in page — and the signed-in shell itself — is its own chunk;
// only the sign-in screen ships in the entry bundle.
const AppShell = lazy(() => import('./features/AppShell.tsx').then((m) => ({ default: m.AppShell })))
const DashboardPage = lazy(() => import('./pages/DashboardPage.tsx'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage.tsx'))
const BoardPage = lazy(() => import('./pages/BoardPage.tsx'))
const MyTasksPage = lazy(() => import('./pages/MyTasksPage.tsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.tsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.tsx'))

function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'checking') return <PageLoading label="Restoring your session" />
  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <Suspense fallback={<PageLoading label="Loading Flowboard" />}>
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
      <Button variant="primary" onClick={() => location.assign(location.pathname)}>Reload Flowboard</Button>
    </div>
  )
}

/** Hash routing so deep links work on static hosting (GitHub Pages). */
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
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'projects', element: <ProjectsPage /> },
            { path: 'projects/:projectId', element: <BoardPage /> },
            { path: 'tasks', element: <MyTasksPage /> },
            { path: 'settings', element: <SettingsPage /> },
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ])
