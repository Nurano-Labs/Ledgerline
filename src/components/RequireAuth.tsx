import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

/**
 * Route guard for the app shell. When signed out, bounces to /login and stashes
 * the attempted location so the login screen can send the user back afterward
 * (keeps `?wizard=…` / `?reset=…` deep links working through the sign-in step).
 */
export function RequireAuth() {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
