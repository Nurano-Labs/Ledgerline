import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { Icon, type IconName } from './Icon'

const NAV_SECTIONS: { label: string; items: { to: string; label: string; icon: IconName; testid: string }[] }[] = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard', testid: 'nav-dashboard' }],
  },
  {
    label: 'Team',
    items: [
      { to: '/people', label: 'People', icon: 'users', testid: 'nav-people' },
      { to: '/time-off', label: 'Time Off', icon: 'clock', testid: 'nav-time-off' },
      { to: '/benefits', label: 'Benefits', icon: 'heart', testid: 'nav-benefits' },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/payroll', label: 'Payroll', icon: 'payroll', testid: 'nav-payroll' },
      { to: '/reports', label: 'Reports', icon: 'chart', testid: 'nav-reports' },
    ],
  },
  {
    label: 'Company',
    items: [{ to: '/settings/company', label: 'Settings', icon: 'settings', testid: 'nav-settings' }],
  },
]

export function Layout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const resetAll = useStore((s) => s.resetAll)
  const toasts = useStore((s) => s.toasts)

  // Harness hooks: ?reset=1 restores the seed; ?reduceMotion=1 kills animation;
  // ?wizard=payroll&step=3 style deep links jump into wizard mid-states.
  useEffect(() => {
    if (params.get('reduceMotion') === '1') {
      document.documentElement.classList.add('reduce-motion')
    }
    const wizard = params.get('wizard')
    const didReset = params.get('reset') === '1'
    if (didReset) resetAll()
    if (wizard === 'payroll' || wizard === 'onboarding') {
      const step = params.get('step') ?? '1'
      const target = wizard === 'payroll' ? '/payroll/run' : '/people/new'
      navigate(`${target}?step=${step}`, { replace: true })
    } else if (didReset) {
      navigate(location.pathname, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white" aria-label="Main navigation">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">LL</span>
          <span className="text-base font-bold tracking-tight text-slate-900">Ledgerline</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={({ isActive }) =>
                    `mb-0.5 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium ${
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon name={item.icon} className="h-4.5 w-4.5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
          Reference date: Jul 1, 2026
          <br />
          Pay schedule: semi-monthly
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          data-testid="demo-banner"
          className="flex shrink-0 items-center justify-center gap-2 bg-amber-400/90 px-4 py-1 text-center text-xs font-semibold text-amber-950"
        >
          <Icon name="warning" className="h-3.5 w-3.5" />
          Demo data — not real tax advice. All people, amounts, and account numbers are fictional.
        </div>
        <header className="z-20 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
          <GlobalSearch />
          <div className="flex-1" />
          <NotificationBell />
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
              SA
            </span>
            Demo Admin
          </span>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>

      {/* Toasts */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast"
            className="pointer-events-auto rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
