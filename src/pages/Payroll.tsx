import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { fmtDate, fmtRange, fmtUSD } from '../data/format'
import { employerCostCents, totalOf } from '../data/payroll'
import { CURRENT_PERIOD, NEXT_PERIOD } from '../data/period'
import { Icon } from '../components/Icon'
import { btnPrimary, cardCls, tdCls, thCls } from '../components/ui'

export function Payroll() {
  const payRuns = useStore((s) => s.payRuns)
  const payrollDue = useStore((s) => s.payrollDue)
  const lastProcessedRunId = useStore((s) => s.lastProcessedRunId)
  const dismissProcessedBanner = useStore((s) => s.dismissProcessedBanner)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">Pay-run history · semi-monthly schedule</p>
        </div>
        {payrollDue && (
          <Link to="/payroll/run" className={btnPrimary} data-testid="payroll-run-button">
            Run payroll — {fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)}
          </Link>
        )}
      </div>

      {lastProcessedRunId && (
        <div
          data-testid="run-processed-banner"
          className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3.5"
        >
          <Icon name="check" className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="flex-1 text-sm font-medium text-emerald-900">
            Pay run {fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)} was approved and processed. Employees are paid on{' '}
            {fmtDate(CURRENT_PERIOD.payDate)}.
          </p>
          <button
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss"
            onClick={dismissProcessedBanner}
            data-testid="dismiss-processed-banner"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      {!payrollDue && !lastProcessedRunId && (
        <p className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm text-slate-600">
          Next run opens after the {fmtRange(NEXT_PERIOD.start, NEXT_PERIOD.end)} period ends.
        </p>
      )}

      <div className={`${cardCls} mt-5 overflow-x-auto`}>
        <table className="w-full min-w-[720px]" data-testid="pay-run-table">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={thCls}>Pay period</th>
              <th className={thCls}>Pay date</th>
              <th className={thCls}>Status</th>
              <th className={`${thCls} text-right`}>Employees</th>
              <th className={`${thCls} text-right`}>Total gross</th>
              <th className={`${thCls} text-right`}>Employer cost</th>
              <th className={`${thCls} text-right`}>Total net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payRuns.map((run) => (
              <tr key={run.id} data-testid={`pay-run-row-${run.id}`}>
                <td className={`${tdCls} font-medium text-slate-800`}>{fmtRange(run.periodStart, run.periodEnd)}</td>
                <td className={tdCls}>{fmtDate(run.payDate)}</td>
                <td className={tdCls}>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <Icon name="check" className="h-3 w-3" />
                    Processed
                  </span>
                </td>
                <td className={`${tdCls} text-right tabular-nums`}>{run.lines.length}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{fmtUSD(totalOf(run.lines, 'gross'))}</td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {fmtUSD(run.lines.reduce((s, l) => s + employerCostCents(l), 0))}
                </td>
                <td className={`${tdCls} text-right font-semibold tabular-nums text-slate-900`}>
                  {fmtUSD(totalOf(run.lines, 'net'))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
