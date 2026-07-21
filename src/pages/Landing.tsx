import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Icon, type IconName } from '../components/Icon'
import { btnPrimary, btnSecondary } from '../components/ui'

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'payroll',
    title: 'Run payroll in minutes',
    body: 'A guided, four-step run with editable hours and one-off bonuses. Every figure is calculated to the cent.',
  },
  {
    icon: 'users',
    title: 'Onboard your team',
    body: 'Add W-2 employees or contractors with a step-by-step wizard covering pay, direct deposit, and benefits.',
  },
  {
    icon: 'clock',
    title: 'Manage time off',
    body: 'Review, approve, or deny requests with balances that update automatically as decisions land.',
  },
  {
    icon: 'heart',
    title: 'Administer benefits',
    body: 'Enroll people in medical plans and see per-paycheck deductions reflected in every run.',
  },
  {
    icon: 'chart',
    title: 'Report and export',
    body: 'Build payroll summaries on screen and export CSVs that match cell-for-cell.',
  },
  {
    icon: 'settings',
    title: 'Company settings',
    body: 'Keep your company profile, pay schedule, and defaults in one predictable place.',
  },
]

export function Landing() {
  const user = useAuth((s) => s.user)

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Top bar */}
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          LL
        </span>
        <span className="text-base font-bold tracking-tight text-slate-900">Ledgerline</span>
        <div className="flex-1" />
        {user ? (
          <Link to="/dashboard" className={btnPrimary} data-testid="landing-open-app">
            Open app
          </Link>
        ) : (
          <Link to="/login" className={btnSecondary} data-testid="landing-signin">
            Sign in
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Payroll & HR, simplified
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Payroll and people, running like clockwork
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Ledgerline brings payroll, onboarding, time off, and benefits into one clean workspace — so pay day is the
          least stressful part of your week.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to={user ? '/dashboard' : '/login'} className={btnPrimary} data-testid="landing-cta">
            {user ? 'Open app' : 'Get started'}
            <Icon name="chevronRight" className="h-4 w-4" />
          </Link>
          <a href="#features" className={btnSecondary} data-testid="landing-learn-more">
            Learn more
          </a>
        </div>
        <p className="mt-6 text-xs text-slate-400" data-testid="landing-demo-note">
          Demo product — all people, amounts, and account numbers are fictional.
        </p>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">Everything you need to pay your team</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
            From the first hire to every pay run, Ledgerline keeps the numbers honest and the workflow obvious.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Ready to see it in action?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Sign in with the demo account and explore a fully seeded payroll workspace.
        </p>
        <div className="mt-6">
          <Link to={user ? '/dashboard' : '/login'} className={btnPrimary} data-testid="landing-cta-bottom">
            {user ? 'Open app' : 'Sign in to the demo'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-xs text-slate-400">© 2026 Ledgerline · Demo data — not real tax advice.</p>
      </footer>
    </div>
  )
}
