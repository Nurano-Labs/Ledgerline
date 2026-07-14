import { Link } from 'react-router-dom'
import { employeeById, pendingPto, useStore } from '../store'
import { fmtDate, fmtRange, fmtUSD } from '../data/format'
import { totalOf } from '../data/payroll'
import { CURRENT_PERIOD, NEXT_PERIOD } from '../data/period'
import { Avatar, PTO_TYPE_LABELS } from '../components/badges'
import { Icon } from '../components/Icon'
import { btnPrimary, cardCls } from '../components/ui'

export function Dashboard() {
  const employees = useStore((s) => s.employees)
  const payRuns = useStore((s) => s.payRuns)
  const ptoRequests = useStore((s) => s.ptoRequests)
  const payrollDue = useStore((s) => s.payrollDue)

  const active = employees.filter((e) => e.status === 'Active')
  const activeW2 = active.filter((e) => e.type === 'w2')
  const contractors = active.filter((e) => e.type === 'contractor')
  const onboarding = employees.filter((e) => e.status === 'Onboarding')
  const pending = pendingPto(ptoRequests)
  const lastRun = payRuns[0]

  const kpis = [
    { label: 'Active employees', value: String(activeW2.length), sub: `${onboarding.length} onboarding`, testid: 'kpi-active' },
    { label: 'Contractors', value: String(contractors.length), sub: 'paid via AP', testid: 'kpi-contractors' },
    { label: 'Pending approvals', value: String(pending.length), sub: 'time-off requests', testid: 'kpi-approvals' },
    {
      label: 'Last run net pay',
      value: lastRun ? fmtUSD(totalOf(lastRun.lines, 'net')) : '—',
      sub: lastRun ? `paid ${fmtDate(lastRun.payDate)}` : '',
      testid: 'kpi-last-net',
    },
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Company overview as of Jul 1, 2026.</p>

      {payrollDue ? (
        <div
          data-testid="payroll-due-alert"
          className="mt-5 flex items-center gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4"
        >
          <Icon name="warning" className="h-6 w-6 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Payroll is due for {fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)}</p>
            <p className="text-sm text-amber-800">
              Pay date {fmtDate(CURRENT_PERIOD.payDate)} · {activeW2.length} employees
            </p>
          </div>
          <Link to="/payroll/run" className={btnPrimary} data-testid="run-payroll-cta">
            Run payroll
          </Link>
        </div>
      ) : (
        <div
          data-testid="payroll-caught-up"
          className="mt-5 flex items-center gap-4 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4"
        >
          <Icon name="check" className="h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-900">Payroll is all caught up</p>
            <p className="text-sm text-emerald-800">
              Next period {fmtRange(NEXT_PERIOD.start, NEXT_PERIOD.end)} · pay date {fmtDate(NEXT_PERIOD.payDate)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} px-5 py-4`} data-testid={k.testid}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{k.value}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${cardCls} p-5`} aria-label="Pending approvals" data-testid="pending-approvals-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Pending time-off approvals</h2>
            <Link to="/time-off" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Review all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {pending.length === 0 && <li className="py-3 text-sm text-slate-500">No pending requests.</li>}
            {pending.slice(0, 5).map((r) => {
              const emp = employeeById(employees, r.employeeId)
              if (!emp) return null
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={emp.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                    <p className="text-xs text-slate-500">
                      {PTO_TYPE_LABELS[r.type]} · {fmtRange(r.startDate, r.endDate)} · {r.hours}h
                    </p>
                  </div>
                  <Link to="/time-off" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Review
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={`${cardCls} p-5`} aria-label="Recent pay runs" data-testid="recent-pay-runs-card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent pay runs</h2>
            <Link to="/payroll" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View history
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100">
            {payRuns.slice(0, 4).map((run) => (
              <li key={run.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800">{fmtRange(run.periodStart, run.periodEnd)}</p>
                  <p className="text-xs text-slate-500">
                    Paid {fmtDate(run.payDate)} · {run.lines.length} employees
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900">{fmtUSD(totalOf(run.lines, 'net'))} net</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
