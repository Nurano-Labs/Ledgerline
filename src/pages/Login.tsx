import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { btnPrimary, inputCls, inputErrorCls, labelCls } from '../components/ui'

export function Login() {
  const user = useAuth((s) => s.user)
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  // Where to land after signing in: the page that bounced us here, or the app home.
  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from
  const dest = from ? `${from.pathname}${from.search}` : '/dashboard'

  // Already signed in — skip the form.
  if (user) return <Navigate to={dest} replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (login(username, password)) {
      navigate(dest, { replace: true })
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2" data-testid="login-brand">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            LL
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">Ledgerline</span>
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back. Enter your credentials to continue.</p>

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <div>
              <label htmlFor="username" className={labelCls}>
                Username
              </label>
              <input
                id="username"
                data-testid="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(false)
                }}
                className={`${inputCls} ${error ? inputErrorCls : ''}`}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelCls}>
                Password
              </label>
              <input
                id="password"
                data-testid="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                className={`${inputCls} ${error ? inputErrorCls : ''}`}
              />
            </div>

            {error && (
              <p data-testid="login-error" className="text-sm text-rose-600" role="alert">
                Incorrect username or password.
              </p>
            )}

            <button type="submit" data-testid="login-submit" className={`${btnPrimary} w-full`}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
