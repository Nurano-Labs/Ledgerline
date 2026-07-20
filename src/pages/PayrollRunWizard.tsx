import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { Adjustment, AdjustmentType, Employee } from '../types'
import { activeHourlyIds, useStore } from '../store'
import { fmtDate, fmtRange, fmtUSD } from '../data/format'
import {
  ALLOWANCE_CENTS,
  basePayCents,
  employerCostCents,
  PERIODS_PER_YEAR,
  sumAdjustments,
  totalOf,
} from '../data/payroll'
import { CURRENT_PERIOD } from '../data/period'
import { buildRunLines, hoursError, parsedHours, payableEmployees } from '../wizards/payrollRun'
import { TypedConfirmDialog } from '../components/dialogs'
import { InfoTip } from '../components/InfoTip'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/badges'
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardCls,
  errorTextCls,
  inputCls,
  inputCompactCls,
  labelCls,
  selectCls,
  tdCls,
  thCls,
} from '../components/ui'

const STEPS = ['Review hours', 'Adjustments', 'Preview', 'Approve'] as const

export function PayrollRunWizard() {
  const employees = useStore((s) => s.employees)
  const plans = useStore((s) => s.plans)
  const state = useStore((s) => s.payrollWizard)
  const dispatch = useStore((s) => s.payrollDispatch)
  const payrollDue = useStore((s) => s.payrollDue)
  const commitPayRun = useStore((s) => s.commitPayRun)
  const toast = useStore((s) => s.toast)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [approveOpen, setApproveOpen] = useState(false)

  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      dispatch({ type: 'DEEP_LINK', step: Number(stepParam) || 1, hourlyIds: activeHourlyIds(employees) })
      setSearchParams({}, { replace: true })
    } else if (!state.started) {
      dispatch({ type: 'START', hourlyIds: activeHourlyIds(employees) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const payable = payableEmployees(employees)
  const hourly = payable.filter((e) => e.comp.mode === 'hourly')
  const salaried = payable.filter((e) => e.comp.mode === 'salary')
  const lines = useMemo(() => buildRunLines(employees, state, plans), [employees, state, plans])

  const hoursInvalid = hourly.some((e) => hoursError(state, e.id) !== null)

  if (!payrollDue) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className={`${cardCls} p-8 text-center`} data-testid="run-already-processed">
          <Icon name="check" className="mx-auto h-10 w-10 text-emerald-500" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">This pay run is already processed</h1>
          <p className="mt-2 text-sm text-slate-600">
            The {fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)} run was approved. The next run opens when the current
            period ends.
          </p>
          <Link to="/payroll" className={`${btnPrimary} mt-5`}>
            View pay-run history
          </Link>
        </div>
      </div>
    )
  }

  function setStep(step: 1 | 2 | 3 | 4) {
    dispatch({ type: 'SET_STEP', step })
  }

  function next() {
    if (state.step === 1 && hoursInvalid) return
    setStep(Math.min(4, state.step + 1) as 1 | 2 | 3 | 4)
  }

  function approve() {
    const run = commitPayRun()
    setApproveOpen(false)
    toast(`Pay run processed — ${run.lines.length} employees paid ${fmtDate(run.payDate)}.`)
    navigate('/payroll')
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Persistent pay-period header */}
      <div className={`${cardCls} flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4`} data-testid="pay-period-header">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            Run payroll
            <InfoTip term="payPeriod" label="pay period" />
          </h1>
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)}</span> · Pay date{' '}
            <span className="font-semibold">{fmtDate(CURRENT_PERIOD.payDate)}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-600">
          <span data-testid="header-employee-count">{payable.length} employees</span>
          <span className="font-semibold text-slate-900" data-testid="header-total-net">
            {fmtUSD(totalOf(lines, 'net'))} total net
          </span>
        </div>
      </div>

      {/* Stepper */}
      <nav aria-label="Payroll run steps" className="mt-5">
        <ol className="flex gap-1.5" data-testid="payroll-stepper">
          {STEPS.map((title, i) => {
            const num = (i + 1) as 1 | 2 | 3 | 4
            const isCurrent = state.step === num
            const isPast = state.step > num
            return (
              <li key={title} className="flex-1">
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  disabled={!isPast && !isCurrent}
                  onClick={() => isPast && setStep(num)}
                  data-testid={`payroll-step-tab-${num}`}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isPast
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px] uppercase tracking-wide opacity-70">Step {num}</span>
                  {title}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="mt-5" data-testid={`payroll-step-${state.step}`}>
        {state.step === 1 && <HoursStep hourly={hourly} salaried={salaried} />}
        {state.step === 2 && <AdjustmentsStep payable={payable} />}
        {state.step === 3 && <PreviewStep payable={payable} />}
        {state.step === 4 && <ApproveStep lines={lines} onApprove={() => setApproveOpen(true)} />}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          className={btnSecondary}
          onClick={() => setStep(Math.max(1, state.step - 1) as 1 | 2 | 3 | 4)}
          disabled={state.step === 1}
          data-testid="payroll-back"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Back
        </button>
        {state.step === 1 && hoursInvalid && (
          <p className="text-sm font-medium text-rose-600" data-testid="hours-blocking-error">
            Fix the highlighted hours to continue.
          </p>
        )}
        {state.step < 4 && (
          <button className={btnPrimary} onClick={next} disabled={state.step === 1 && hoursInvalid} data-testid="payroll-next">
            Continue
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        )}
      </div>

      <TypedConfirmDialog
        open={approveOpen}
        title="Approve this pay run?"
        body={
          <p>
            This processes payroll for <strong>{lines.length} employees</strong> — total net{' '}
            <strong>{fmtUSD(totalOf(lines, 'net'))}</strong>, paid on <strong>{fmtDate(CURRENT_PERIOD.payDate)}</strong>. Once
            approved, the run is recorded in history and can’t be edited in this demo.
          </p>
        }
        requiredText="APPROVE"
        confirmLabel="Approve pay run"
        onCancel={() => setApproveOpen(false)}
        onConfirm={approve}
      />
    </div>
  )
}

// ---- Step 1: Review hours ----------------------------------------------------

function HoursStep({ hourly, salaried }: { hourly: Employee[]; salaried: Employee[] }) {
  const state = useStore((s) => s.payrollWizard)
  const dispatch = useStore((s) => s.payrollDispatch)

  return (
    <div className="space-y-5">
      <section className={`${cardCls} overflow-hidden`}>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-semibold text-slate-900">Hourly employees</h2>
          <InfoTip term="overtime" label="overtime" />
          <span className="ml-auto text-xs text-slate-500">Regular hours ≤ 80 · OT paid at 1.5×</span>
        </div>
        <table className="w-full" data-testid="hours-table">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Employee</th>
              <th className={thCls}>Rate</th>
              <th className={thCls}>Regular hours</th>
              <th className={thCls}>OT hours</th>
              <th className={`${thCls} text-right`}>Period gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hourly.map((emp) => {
              const err = hoursError(state, emp.id)
              const h = state.hours[emp.id] ?? { regular: '80', ot: '0' }
              return (
                <tr key={emp.id} data-employee-id={emp.id} data-testid={`hours-row-${emp.id}`}>
                  <td className={tdCls}>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={emp.name} size="sm" />
                      <span>
                        <span className="block font-medium text-slate-800">{emp.name}</span>
                        <span className="block text-xs text-slate-500">{emp.department}</span>
                      </span>
                    </span>
                  </td>
                  <td className={`${tdCls} tabular-nums`}>{fmtUSD(emp.comp.amount * 100)}/hr</td>
                  <td className={tdCls}>
                    <input
                      inputMode="decimal"
                      aria-label={`${emp.name} regular hours`}
                      className={`${inputCompactCls} w-24 text-right ${err ? 'border-rose-400' : ''}`}
                      value={h.regular}
                      data-testid={`regular-hours-${emp.id}`}
                      onChange={(e) => dispatch({ type: 'SET_HOURS', employeeId: emp.id, field: 'regular', value: e.target.value })}
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      inputMode="decimal"
                      aria-label={`${emp.name} overtime hours`}
                      className={`${inputCompactCls} w-24 text-right ${err ? 'border-rose-400' : ''}`}
                      value={h.ot}
                      data-testid={`ot-hours-${emp.id}`}
                      onChange={(e) => dispatch({ type: 'SET_HOURS', employeeId: emp.id, field: 'ot', value: e.target.value })}
                    />
                    {err && <p className={errorTextCls}>{err}</p>}
                  </td>
                  <td className={`${tdCls} text-right font-medium tabular-nums`} data-testid={`period-gross-${emp.id}`}>
                    {fmtUSD(basePayCents(emp, parsedHours(state, emp.id)))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <h2 className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">
          Salaried employees <span className="ml-1 text-xs font-normal text-slate-500">read-only — paid a fixed semi-monthly amount</span>
        </h2>
        <table className="w-full" data-testid="salaried-table">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Employee</th>
              <th className={thCls}>Annual salary</th>
              <th className={`${thCls} text-right`}>Period gross (÷ {PERIODS_PER_YEAR})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salaried.map((emp) => (
              <tr key={emp.id} data-employee-id={emp.id}>
                <td className={tdCls}>
                  <span className="flex items-center gap-2.5">
                    <Avatar name={emp.name} size="sm" />
                    <span>
                      <span className="block font-medium text-slate-800">{emp.name}</span>
                      <span className="block text-xs text-slate-500">{emp.department}</span>
                    </span>
                  </span>
                </td>
                <td className={`${tdCls} tabular-nums`}>{fmtUSD(emp.comp.amount * 100)}</td>
                <td className={`${tdCls} text-right font-medium tabular-nums`}>
                  {fmtUSD(basePayCents(emp, { regular: 0, ot: 0 }))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

// ---- Step 2: Adjustments -------------------------------------------------------

const ADJ_LABELS: Record<AdjustmentType, string> = { bonus: 'Bonus', reimbursement: 'Reimbursement', deduction: 'Deduction' }

let adjSeq = 0

function AdjustmentsStep({ payable }: { payable: Employee[] }) {
  const state = useStore((s) => s.payrollWizard)
  const dispatch = useStore((s) => s.payrollDispatch)
  const [openFor, setOpenFor] = useState<string | null>(null)
  const [placement, setPlacement] = useState<'above' | 'below'>('below')
  const [form, setForm] = useState<{ type: AdjustmentType; amount: string; memo: string }>({ type: 'bonus', amount: '', memo: '' })
  const [formError, setFormError] = useState('')

  const totalAdjCents = payable.reduce((s, e) => {
    const adjs = state.adjustments[e.id] ?? []
    return s + sumAdjustments(adjs, 'bonus') + sumAdjustments(adjs, 'reimbursement') - sumAdjustments(adjs, 'deduction')
  }, 0)

  function openPopover(empId: string, row: HTMLElement) {
    const rect = row.getBoundingClientRect()
    setPlacement(rect.top + rect.height / 2 > window.innerHeight / 2 ? 'above' : 'below')
    setOpenFor(empId)
    setForm({ type: 'bonus', amount: '', memo: '' })
    setFormError('')
  }

  function submit(empId: string) {
    const amount = Number(form.amount)
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setFormError('Enter an amount greater than $0.')
      return
    }
    const adjustment: Adjustment = {
      id: `adj-${++adjSeq}`,
      type: form.type,
      amount: Math.round(amount * 100),
      memo: form.memo.trim() || ADJ_LABELS[form.type],
    }
    dispatch({ type: 'ADD_ADJUSTMENT', employeeId: empId, adjustment })
    setOpenFor(null)
  }

  return (
    <section className={`${cardCls} overflow-visible`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h2 className="font-semibold text-slate-900">One-off adjustments</h2>
        <p className="text-sm text-slate-600">
          Net effect this run:{' '}
          <span
            className={`font-semibold tabular-nums ${totalAdjCents >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
            data-testid="adjustments-total"
          >
            {totalAdjCents >= 0 ? '+' : '−'}
            {fmtUSD(Math.abs(totalAdjCents))}
          </span>
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {payable.map((emp) => {
          const adjs = state.adjustments[emp.id] ?? []
          const isOpen = openFor === emp.id
          return (
            <li key={emp.id} className="relative px-5 py-3" data-employee-id={emp.id} data-testid={`adjustments-row-${emp.id}`}>
              <div className="flex items-center gap-3">
                <Avatar name={emp.name} size="sm" />
                <div className="w-56">
                  <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                  <p className="text-xs text-slate-500">{emp.department}</p>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-1.5">
                  {adjs.length === 0 && <span className="text-xs text-slate-400">No adjustments</span>}
                  {adjs.map((a) => (
                    <span
                      key={a.id}
                      className={`inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium ring-1 ring-inset ${
                        a.type === 'deduction'
                          ? 'bg-rose-50 text-rose-700 ring-rose-600/20'
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      }`}
                      data-testid={`adjustment-chip-${a.id}`}
                    >
                      {ADJ_LABELS[a.type]} {a.type === 'deduction' ? '−' : '+'}
                      {fmtUSD(a.amount)}
                      {a.memo !== ADJ_LABELS[a.type] && <span className="font-normal opacity-70">· {a.memo}</span>}
                      <button
                        type="button"
                        aria-label={`Remove ${ADJ_LABELS[a.type]} for ${emp.name}`}
                        className="rounded-full p-0.5 hover:bg-black/10"
                        onClick={() => dispatch({ type: 'REMOVE_ADJUSTMENT', employeeId: emp.id, adjustmentId: a.id })}
                      >
                        <Icon name="x" className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  className={btnGhost}
                  onClick={(e) => (isOpen ? setOpenFor(null) : openPopover(emp.id, e.currentTarget.closest('li')!))}
                  data-testid={`add-adjustment-${emp.id}`}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add adjustment
                </button>
              </div>
              {isOpen && (
                <div
                  className={`absolute right-5 z-30 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl ${
                    placement === 'above' ? 'bottom-full -mb-1' : 'top-full -mt-1'
                  }`}
                  data-placement={placement}
                  data-testid="adjustment-popover"
                >
                  <h3 className="text-sm font-semibold text-slate-900">Add adjustment for {emp.name}</h3>
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className={labelCls}>
                        Type
                        <InfoTip term={form.type} label={ADJ_LABELS[form.type].toLowerCase()} />
                      </span>
                      <select
                        className={selectCls}
                        value={form.type}
                        data-testid="adjustment-type"
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AdjustmentType }))}
                      >
                        {(Object.keys(ADJ_LABELS) as AdjustmentType[]).map((t) => (
                          <option key={t} value={t}>
                            {ADJ_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>Amount ($)</span>
                      <input
                        inputMode="decimal"
                        className={inputCls}
                        value={form.amount}
                        placeholder="500"
                        data-testid="adjustment-amount"
                        onChange={(e) => {
                          setForm((f) => ({ ...f, amount: e.target.value }))
                          setFormError('')
                        }}
                      />
                      {formError && <p className={errorTextCls}>{formError}</p>}
                    </label>
                    <label className="block">
                      <span className={labelCls}>Memo (optional)</span>
                      <input
                        className={inputCls}
                        value={form.memo}
                        placeholder="Q2 spot bonus"
                        data-testid="adjustment-memo"
                        onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <button className={btnSecondary} onClick={() => setOpenFor(null)}>
                        Cancel
                      </button>
                      <button className={btnPrimary} onClick={() => submit(emp.id)} data-testid="adjustment-submit">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---- Step 3: Preview -----------------------------------------------------------

function PreviewStep({ payable }: { payable: Employee[] }) {
  const state = useStore((s) => s.payrollWizard)
  const plans = useStore((s) => s.plans)
  const [expanded, setExpanded] = useState<string | null>(null)
  const lines = useMemo(() => buildRunLines(payable, state, plans), [payable, state, plans])
  const byId = new Map(payable.map((e) => [e.id, e]))

  const headers: { label: string; term?: Parameters<typeof InfoTip>[0]['term'] }[] = [
    { label: 'Employee' },
    { label: 'Gross', term: 'grossPay' },
    { label: 'Fed WH', term: 'federalWithholding' },
    { label: 'State WH', term: 'stateWithholding' },
    { label: 'Soc. Sec.', term: 'socialSecurity' },
    { label: 'Medicare', term: 'medicare' },
    { label: 'Benefits', term: 'benefitDeductions' },
    { label: 'Net pay', term: 'netPay' },
  ]

  return (
    <section className={`${cardCls} overflow-x-auto`}>
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="font-semibold text-slate-900">Preview — gross to net</h2>
        <p className="text-xs text-slate-500">
          Simplified mock formulas: federal 12% after a filing-status allowance · state 4% · Social Security 6.2% · Medicare
          1.45%. Click a row to see the line-item math.
        </p>
      </div>
      <table className="w-full min-w-[880px]" data-testid="preview-table">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th key={h.label} className={`${thCls} ${i > 0 ? 'text-right' : ''}`}>
                <span className="inline-flex items-center gap-1">
                  {h.label}
                  {h.term && <InfoTip term={h.term} label={h.label} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => {
            const emp = byId.get(line.employeeId)
            if (!emp) return null
            const isOpen = expanded === line.employeeId
            return [
              <tr
                key={line.employeeId}
                data-employee-id={line.employeeId}
                data-testid={`preview-row-${line.employeeId}`}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(isOpen ? null : line.employeeId)}
              >
                <td className={tdCls}>
                  <span className="flex items-center gap-2">
                    <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-800">{emp.name}</span>
                    {line.adjustments.length > 0 && (
                      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {line.adjustments.length} adj
                      </span>
                    )}
                  </span>
                </td>
                <td className={`${tdCls} text-right tabular-nums`}>{fmtUSD(line.gross)}</td>
                <td className={`${tdCls} text-right tabular-nums text-slate-600`}>−{fmtUSD(line.fedWH)}</td>
                <td className={`${tdCls} text-right tabular-nums text-slate-600`}>−{fmtUSD(line.stateWH)}</td>
                <td className={`${tdCls} text-right tabular-nums text-slate-600`}>−{fmtUSD(line.socialSecurity)}</td>
                <td className={`${tdCls} text-right tabular-nums text-slate-600`}>−{fmtUSD(line.medicare)}</td>
                <td className={`${tdCls} text-right tabular-nums text-slate-600`}>−{fmtUSD(line.benefitDeductions)}</td>
                <td className={`${tdCls} text-right font-semibold tabular-nums text-slate-900`} data-testid={`net-pay-${line.employeeId}`}>
                  {fmtUSD(line.net)}
                </td>
              </tr>,
              isOpen ? (
                <tr key={`${line.employeeId}-detail`} className="bg-slate-50/60">
                  <td colSpan={8} className="px-6 pb-4 pt-1">
                    <LineDetail emp={emp} line={line} />
                  </td>
                </tr>
              ) : null,
            ]
          })}
        </tbody>
        <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
          <tr data-testid="preview-totals">
            <td className={tdCls}>
              <span className="inline-flex items-center gap-1.5">
                Totals · employer cost {fmtUSD(lines.reduce((s, l) => s + employerCostCents(l), 0))}
                <InfoTip term="employerCost" label="employer cost" />
              </span>
            </td>
            <td className={`${tdCls} text-right tabular-nums`} data-testid="total-gross">
              {fmtUSD(totalOf(lines, 'gross'))}
            </td>
            <td className={`${tdCls} text-right tabular-nums`}>−{fmtUSD(totalOf(lines, 'fedWH'))}</td>
            <td className={`${tdCls} text-right tabular-nums`}>−{fmtUSD(totalOf(lines, 'stateWH'))}</td>
            <td className={`${tdCls} text-right tabular-nums`}>−{fmtUSD(totalOf(lines, 'socialSecurity'))}</td>
            <td className={`${tdCls} text-right tabular-nums`}>−{fmtUSD(totalOf(lines, 'medicare'))}</td>
            <td className={`${tdCls} text-right tabular-nums`}>−{fmtUSD(totalOf(lines, 'benefitDeductions'))}</td>
            <td className={`${tdCls} text-right tabular-nums text-slate-900`} data-testid="total-net">
              {fmtUSD(totalOf(lines, 'net'))}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function LineDetail({ emp, line }: { emp: Employee; line: ReturnType<typeof buildRunLines>[number] }) {
  const w4 = emp.w4 ?? { filingStatus: 'single' as const, dependentsAmt: 0, extraWithholding: 0 }
  const allowance = ALLOWANCE_CENTS[w4.filingStatus]
  const depCredit = Math.round((w4.dependentsAmt * 100) / PERIODS_PER_YEAR)
  const bonuses = sumAdjustments(line.adjustments, 'bonus')
  const reimb = sumAdjustments(line.adjustments, 'reimbursement')
  const deducts = sumAdjustments(line.adjustments, 'deduction')
  const base = line.gross - bonuses

  const rows: { label: string; value: string }[] = [
    {
      label:
        emp.comp.mode === 'salary'
          ? `Base pay — ${fmtUSD(emp.comp.amount * 100)} annual ÷ ${PERIODS_PER_YEAR} periods`
          : `Base pay — ${line.hours?.regular ?? 0}h × ${fmtUSD(emp.comp.amount * 100)}${
              line.hours?.ot ? ` + ${line.hours.ot}h OT × ${fmtUSD(Math.round(emp.comp.amount * 1.5 * 100))}` : ''
            }`,
      value: fmtUSD(base),
    },
    ...(bonuses > 0 ? [{ label: 'Bonuses (taxable)', value: `+${fmtUSD(bonuses)}` }] : []),
    { label: 'Taxable gross', value: fmtUSD(line.gross) },
    {
      label: `Federal withholding — 12% × (gross − ${fmtUSD(allowance)} allowance${depCredit ? ` − ${fmtUSD(depCredit)} dependents credit` : ''})${
        w4.extraWithholding ? ` + ${fmtUSD(w4.extraWithholding * 100)} extra` : ''
      }`,
      value: `−${fmtUSD(line.fedWH)}`,
    },
    { label: 'State withholding — flat 4%', value: `−${fmtUSD(line.stateWH)}` },
    { label: 'Social Security — 6.2%', value: `−${fmtUSD(line.socialSecurity)}` },
    { label: 'Medicare — 1.45%', value: `−${fmtUSD(line.medicare)}` },
    ...(line.benefitDeductions > 0 ? [{ label: 'Benefit deductions (medical + dental + vision)', value: `−${fmtUSD(line.benefitDeductions)}` }] : []),
    ...(reimb > 0 ? [{ label: 'Reimbursements (after tax)', value: `+${fmtUSD(reimb)}` }] : []),
    ...(deducts > 0 ? [{ label: 'Other post-tax deductions', value: `−${fmtUSD(deducts)}` }] : []),
  ]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" data-testid={`line-detail-${emp.id}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line-item math for {emp.name}</h3>
      <dl className="mt-2 space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-6 text-sm">
            <dt className="text-slate-600">{r.label}</dt>
            <dd className="tabular-nums text-slate-800">{r.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-6 border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
          <dt>Net pay</dt>
          <dd className="tabular-nums">{fmtUSD(line.net)}</dd>
        </div>
      </dl>
    </div>
  )
}

// ---- Step 4: Approve -----------------------------------------------------------

function ApproveStep({ lines, onApprove }: { lines: ReturnType<typeof buildRunLines>; onApprove: () => void }) {
  const taxes = totalOf(lines, 'fedWH') + totalOf(lines, 'stateWH') + totalOf(lines, 'socialSecurity') + totalOf(lines, 'medicare')
  return (
    <section className={`${cardCls} mx-auto max-w-xl p-6`} data-testid="approve-summary">
      <h2 className="text-lg font-semibold text-slate-900">Approve pay run</h2>
      <p className="mt-1 text-sm text-slate-500">Final check before processing — approval commits this run to history.</p>
      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Pay period</dt>
          <dd className="font-medium text-slate-900">{fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Pay date</dt>
          <dd className="font-medium text-slate-900">{fmtDate(CURRENT_PERIOD.payDate)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Employees paid</dt>
          <dd className="font-medium text-slate-900">{lines.length}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2.5">
          <dt className="text-slate-600">Total gross</dt>
          <dd className="font-medium tabular-nums text-slate-900">{fmtUSD(totalOf(lines, 'gross'))}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Total taxes withheld</dt>
          <dd className="font-medium tabular-nums text-slate-900">−{fmtUSD(taxes)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Total benefit deductions</dt>
          <dd className="font-medium tabular-nums text-slate-900">−{fmtUSD(totalOf(lines, 'benefitDeductions'))}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="flex items-center gap-1.5 text-slate-600">
            Total employer cost
            <InfoTip term="employerCost" label="employer cost" />
          </dt>
          <dd className="font-medium tabular-nums text-slate-900">{fmtUSD(lines.reduce((s, l) => s + employerCostCents(l), 0))}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2.5 text-base font-bold text-slate-900">
          <dt>Total net pay</dt>
          <dd className="tabular-nums" data-testid="approve-total-net">
            {fmtUSD(totalOf(lines, 'net'))}
          </dd>
        </div>
      </dl>
      <button className={`${btnPrimary} mt-6 w-full`} onClick={onApprove} data-testid="approve-open-dialog">
        Approve payroll…
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">You’ll be asked to type APPROVE to confirm.</p>
    </section>
  )
}
