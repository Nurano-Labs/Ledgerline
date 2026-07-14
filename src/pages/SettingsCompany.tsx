import { fmtDate } from '../data/format'
import { CURRENT_PERIOD, NEXT_PERIOD } from '../data/period'
import { useStore } from '../store'
import { InfoTip } from '../components/InfoTip'
import { Icon } from '../components/Icon'
import { cardCls } from '../components/ui'

export function SettingsCompany() {
  const payrollDue = useStore((s) => s.payrollDue)
  const nextPayDate = payrollDue ? CURRENT_PERIOD.payDate : NEXT_PERIOD.payDate
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Company settings</h1>
      <p className="mt-1 text-sm text-slate-500">Legal entity, pay schedule, and work locations.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <section className={`${cardCls} p-5`} data-testid="legal-entity-card">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Icon name="building" className="h-5 w-5 text-slate-400" />
            Legal entity
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Legal name</dt>
              <dd className="font-medium text-slate-800">Ledgerline Demo Co.</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Entity type</dt>
              <dd className="font-medium text-slate-800">C-Corporation (Delaware)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">EIN</dt>
              <dd className="font-medium tabular-nums text-slate-800">98-7654321 (fictional)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Registered address</dt>
              <dd className="text-right font-medium text-slate-800">
                100 Demo Plaza, Suite 400
                <br />
                San Francisco, CA 94105
              </dd>
            </div>
          </dl>
        </section>

        <section className={`${cardCls} p-5`} data-testid="pay-schedule-card">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Icon name="calendar" className="h-5 w-5 text-slate-400" />
            Pay schedule
            <InfoTip term="payPeriod" label="pay period" />
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Frequency</dt>
              <dd className="font-medium text-slate-800">Semi-monthly (24 periods / year)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Periods</dt>
              <dd className="font-medium text-slate-800">1st–15th and 16th–end of month</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Pay dates</dt>
              <dd className="font-medium text-slate-800">3 days after each period ends</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Next pay date</dt>
              <dd className="font-medium text-slate-800">{fmtDate(nextPayDate)}</dd>
            </div>
          </dl>
        </section>

        <section className={`${cardCls} p-5 lg:col-span-2`} data-testid="work-locations-card">
          <h2 className="font-semibold text-slate-900">Work locations</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { name: 'San Francisco HQ', address: '100 Demo Plaza, Suite 400, San Francisco, CA', people: 'Engineering · Finance' },
              { name: 'Austin office', address: '42 Placeholder Ave, Austin, TX', people: 'Sales · Marketing' },
              { name: 'Remote', address: 'Distributed — US only', people: 'Operations · various' },
            ].map((loc) => (
              <li key={loc.name} className="rounded-lg border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{loc.name}</p>
                <p className="mt-1 text-sm text-slate-600">{loc.address}</p>
                <p className="mt-2 text-xs text-slate-400">{loc.people}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">Company settings are read-only in this demo.</p>
        </section>
      </div>
    </div>
  )
}
