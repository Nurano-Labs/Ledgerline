import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { fmtUSD } from '../data/format'
import { benefitDeductionCents, DENTAL_COST_CENTS, VISION_COST_CENTS } from '../data/payroll'
import { InfoTip } from '../components/InfoTip'
import { cardCls, tdCls, thCls } from '../components/ui'

const TIER_STYLES: Record<string, string> = {
  Bronze: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Silver: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Gold: 'bg-yellow-50 text-yellow-700 ring-yellow-600/30',
}

export function Benefits() {
  const plans = useStore((s) => s.plans)
  const employees = useStore((s) => s.employees)

  const enrollable = employees.filter((e) => e.type === 'w2' && e.status !== 'Terminated')

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-900">Benefits</h1>
      <p className="mt-1 text-sm text-slate-500">
        Medical plans plus dental ({fmtUSD(DENTAL_COST_CENTS)}/paycheck) and vision ({fmtUSD(VISION_COST_CENTS)}/paycheck) riders.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const enrolled = enrollable.filter((e) => e.benefits?.medicalPlanId === plan.id).length
          return (
            <div key={plan.id} className={`${cardCls} p-5`} data-testid={`plan-card-${plan.id}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{plan.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TIER_STYLES[plan.tier]}`}>
                  {plan.tier}
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {fmtUSD(plan.perPaycheckCost)}
                <span className="text-sm font-medium text-slate-500"> / paycheck</span>
              </p>
              <dl className="mt-3 space-y-1 text-sm text-slate-600">
                <div className="flex justify-between">
                  <dt>Deductible</dt>
                  <dd className="font-medium text-slate-800">{plan.deductible}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Network</dt>
                  <dd className="font-medium text-slate-800">{plan.network}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Enrolled</dt>
                  <dd className="font-medium text-slate-800">{enrolled} employees</dd>
                </div>
              </dl>
            </div>
          )
        })}
      </div>

      <section className={`${cardCls} mt-6 overflow-x-auto`}>
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">
          Enrollment status
          <InfoTip term="benefitDeductions" label="benefit deductions" />
        </h2>
        <table className="w-full min-w-[720px]" data-testid="enrollment-table">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Employee</th>
              <th className={thCls}>Department</th>
              <th className={thCls}>Medical plan</th>
              <th className={thCls}>Dental</th>
              <th className={thCls}>Vision</th>
              <th className={`${thCls} text-right`}>Per-paycheck deduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {enrollable.map((emp) => {
              const plan = plans.find((p) => p.id === emp.benefits?.medicalPlanId)
              return (
                <tr key={emp.id} data-employee-id={emp.id} data-testid={`enrollment-row-${emp.id}`}>
                  <td className={tdCls}>
                    <Link to={`/people/${emp.id}`} className="font-medium text-slate-800 hover:text-indigo-700">
                      {emp.name}
                    </Link>
                  </td>
                  <td className={tdCls}>{emp.department}</td>
                  <td className={tdCls}>{plan ? plan.name : <span className="text-slate-400">Waived</span>}</td>
                  <td className={tdCls}>{emp.benefits?.dental ? '✓' : '—'}</td>
                  <td className={tdCls}>{emp.benefits?.vision ? '✓' : '—'}</td>
                  <td className={`${tdCls} text-right font-medium tabular-nums`}>{fmtUSD(benefitDeductionCents(emp, plans))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
