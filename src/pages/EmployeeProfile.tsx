import { useMemo, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import type { Department, Employee, FilingStatus } from '../types'
import { DEPARTMENTS, FILING_STATUS_LABELS } from '../types'
import { employeeById, useStore } from '../store'
import { fmtDate, fmtRange, fmtUSD } from '../data/format'
import { PERIODS_PER_YEAR } from '../data/payroll'
import { Avatar, PTO_TYPE_LABELS, StatusBadge, TypeBadge } from '../components/badges'
import { ConfirmDialog } from '../components/dialogs'
import { InfoTip } from '../components/InfoTip'
import { Icon } from '../components/Icon'
import { btnPrimary, btnSecondary, cardCls, errorTextCls, inputCls, inputErrorCls, labelCls, selectCls, tdCls, thCls } from '../components/ui'

type TabId = 'overview' | 'job-pay' | 'tax' | 'time-off' | 'documents'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'job-pay', label: 'Job & Pay' },
  { id: 'tax', label: 'Tax Withholding' },
  { id: 'time-off', label: 'Time Off' },
  { id: 'documents', label: 'Documents' },
]

export function EmployeeProfile() {
  const { id } = useParams()
  const employees = useStore((s) => s.employees)
  const emp = employeeById(employees, id)
  const [tab, setTab] = useState<TabId>('overview')
  const [dirty, setDirty] = useState(false)
  const [discardCount, setDiscardCount] = useState(0)
  const [pendingTab, setPendingTab] = useState<TabId | null>(null)

  // Unsaved-changes guard on route navigation…
  const blocker = useBlocker(dirty)
  // …and on in-page tab switches.
  function requestTab(next: TabId) {
    if (next === tab) return
    if (dirty) setPendingTab(next)
    else setTab(next)
  }

  if (!emp) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-slate-600">Employee not found.</p>
        <Link to="/people" className="text-indigo-600 hover:underline">
          Back to People
        </Link>
      </div>
    )
  }

  const manager = employeeById(employees, emp.managerId)

  return (
    <div className="mx-auto max-w-5xl" data-employee-id={emp.id}>
      <Link to="/people" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
        <Icon name="arrowLeft" className="h-4 w-4" />
        People
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={emp.name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900" data-testid="profile-name">
              {emp.name}
            </h1>
            <StatusBadge status={emp.status} />
            <TypeBadge type={emp.type} />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {emp.department} · {emp.email} · started {fmtDate(emp.hireDate)}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Employee profile sections" className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            data-testid={`tab-${t.id}`}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => requestTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab emp={emp} managerName={manager?.name} />}
        {tab === 'job-pay' && <JobPayTab key={`jp-${discardCount}`} emp={emp} onDirtyChange={setDirty} />}
        {tab === 'tax' && <TaxTab key={`tax-${discardCount}`} emp={emp} onDirtyChange={setDirty} />}
        {tab === 'time-off' && <TimeOffTab emp={emp} />}
        {tab === 'documents' && <DocumentsTab emp={emp} />}
      </div>

      <ConfirmDialog
        open={pendingTab !== null || blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        body="You have unsaved edits on this tab. If you leave now they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        danger
        onCancel={() => {
          setPendingTab(null)
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onConfirm={() => {
          setDirty(false)
          setDiscardCount((c) => c + 1)
          if (pendingTab) {
            setTab(pendingTab)
            setPendingTab(null)
          }
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </div>
  )
}

// ---- Overview --------------------------------------------------------------

function Field({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div data-testid={testid}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  )
}

function OverviewTab({ emp, managerName }: { emp: Employee; managerName?: string }) {
  const plans = useStore((s) => s.plans)
  const plan = emp.benefits?.medicalPlanId ? plans.find((p) => p.id === emp.benefits?.medicalPlanId) : undefined
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={`${cardCls} p-5`}>
        <h2 className="font-semibold text-slate-900">Employment</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Department">{emp.department}</Field>
          <Field label="Manager">{managerName ?? '—'}</Field>
          <Field label="Employment type">{emp.type === 'w2' ? 'W-2 employee' : '1099 contractor'}</Field>
          <Field label="Start date">{fmtDate(emp.hireDate)}</Field>
          <Field label="Status">{emp.status}</Field>
          <Field label="Email">{emp.email}</Field>
        </dl>
      </section>
      <section className={`${cardCls} p-5`}>
        <h2 className="font-semibold text-slate-900">Pay & benefits at a glance</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Compensation">
            {emp.comp.mode === 'salary' ? `${fmtUSD(emp.comp.amount * 100)} / year` : `${fmtUSD(emp.comp.amount * 100)} / hour`}
          </Field>
          <Field label="Per pay period">
            {emp.comp.mode === 'salary'
              ? fmtUSD(Math.round((emp.comp.amount * 100) / PERIODS_PER_YEAR))
              : `${emp.comp.expectedHours ?? 80}h expected`}
          </Field>
          <Field label="Medical plan">{plan ? plan.name : emp.type === 'w2' ? 'Waived' : 'n/a'}</Field>
          <Field label="PTO balance">{emp.type === 'w2' ? `${emp.ptoBalanceHrs} hours` : 'n/a'}</Field>
        </dl>
      </section>
    </div>
  )
}

// ---- Job & Pay (editable) ----------------------------------------------------

function JobPayTab({ emp, onDirtyChange }: { emp: Employee; onDirtyChange: (d: boolean) => void }) {
  const updateEmployee = useStore((s) => s.updateEmployee)
  const employees = useStore((s) => s.employees)
  const toast = useStore((s) => s.toast)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    department: emp.department as Department,
    managerId: emp.managerId ?? '',
    mode: emp.comp.mode,
    amount: String(emp.comp.amount),
    flsaExempt: emp.comp.flsaExempt ?? true,
    expectedHours: String(emp.comp.expectedHours ?? 80),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const managers = employees.filter((e) => e.managerId === undefined && e.type === 'w2' && e.id !== emp.id)

  function isDirty(next: typeof form) {
    return (
      next.department !== emp.department ||
      next.managerId !== (emp.managerId ?? '') ||
      next.mode !== emp.comp.mode ||
      next.amount !== String(emp.comp.amount) ||
      next.flsaExempt !== (emp.comp.flsaExempt ?? true) ||
      next.expectedHours !== String(emp.comp.expectedHours ?? 80)
    )
  }

  function patch(p: Partial<typeof form>) {
    const next = { ...form, ...p }
    setForm(next)
    onDirtyChange(editing && isDirty(next))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    const amount = Number(form.amount)
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      errs.amount = form.mode === 'salary' ? 'Annual salary must be greater than $0.' : 'Hourly rate must be greater than $0.'
    }
    if (form.mode === 'hourly') {
      const hrs = Number(form.expectedHours)
      if (Number.isNaN(hrs) || hrs <= 0 || hrs > 120) errs.expectedHours = 'Expected hours must be between 1 and 120.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function save() {
    if (!validate()) return
    updateEmployee(emp.id, {
      department: form.department,
      managerId: form.managerId || undefined,
      comp:
        form.mode === 'salary'
          ? { mode: 'salary', amount: Number(form.amount), flsaExempt: form.flsaExempt }
          : { mode: 'hourly', amount: Number(form.amount), expectedHours: Number(form.expectedHours) },
    })
    setEditing(false)
    onDirtyChange(false)
    toast('Job & pay details saved.')
  }

  function cancel() {
    setForm({
      department: emp.department,
      managerId: emp.managerId ?? '',
      mode: emp.comp.mode,
      amount: String(emp.comp.amount),
      flsaExempt: emp.comp.flsaExempt ?? true,
      expectedHours: String(emp.comp.expectedHours ?? 80),
    })
    setErrors({})
    setEditing(false)
    onDirtyChange(false)
  }

  return (
    <section className={`${cardCls} max-w-2xl p-5`} data-testid="job-pay-section">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Job & Pay</h2>
        {!editing ? (
          <button className={btnSecondary} onClick={() => setEditing(true)} data-testid="job-pay-edit">
            <Icon name="edit" className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={cancel} data-testid="job-pay-cancel">
              Cancel
            </button>
            <button className={btnPrimary} onClick={save} data-testid="job-pay-save">
              Save
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Department" testid="job-pay-department">{emp.department}</Field>
          <Field label="Manager">{employeeById(employees, emp.managerId)?.name ?? '—'}</Field>
          <Field label="Pay type">{emp.comp.mode === 'salary' ? 'Salaried' : 'Hourly'}</Field>
          <Field label={emp.comp.mode === 'salary' ? 'Annual salary' : 'Hourly rate'} testid="job-pay-amount">
            {fmtUSD(emp.comp.amount * 100)}
            {emp.comp.mode === 'hourly' ? '/hr' : '/yr'}
          </Field>
          {emp.comp.mode === 'salary' ? (
            <Field label="FLSA classification">{emp.comp.flsaExempt ? 'Exempt from overtime' : 'Non-exempt (overtime eligible)'}</Field>
          ) : (
            <Field label="Expected hours / period">{emp.comp.expectedHours ?? 80}h</Field>
          )}
        </dl>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Department</span>
            <select
              className={selectCls}
              value={form.department}
              data-testid="job-pay-department-select"
              onChange={(e) => patch({ department: e.target.value as Department })}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Manager</span>
            <select
              className={selectCls}
              value={form.managerId}
              data-testid="job-pay-manager-select"
              onChange={(e) => patch({ managerId: e.target.value })}
            >
              <option value="">No manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.department}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="col-span-2">
            <legend className={labelCls}>Pay type</legend>
            <div className="flex gap-4">
              {(['salary', 'hourly'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pay-mode"
                    className="accent-indigo-600"
                    checked={form.mode === mode}
                    data-testid={`job-pay-mode-${mode}`}
                    onChange={() => patch({ mode })}
                  />
                  {mode === 'salary' ? 'Salaried' : 'Hourly'}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className={labelCls}>{form.mode === 'salary' ? 'Annual salary ($)' : 'Hourly rate ($)'}</span>
            <input
              type="number"
              min="0"
              className={`${inputCls} ${errors.amount ? inputErrorCls : ''}`}
              value={form.amount}
              data-testid="job-pay-amount-input"
              onChange={(e) => patch({ amount: e.target.value })}
            />
            {errors.amount && <p className={errorTextCls}>{errors.amount}</p>}
          </label>
          {form.mode === 'salary' ? (
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={form.flsaExempt}
                data-testid="job-pay-flsa"
                onChange={(e) => patch({ flsaExempt: e.target.checked })}
              />
              FLSA exempt
              <InfoTip term="flsaExempt" label="FLSA exempt" />
            </label>
          ) : (
            <label className="block">
              <span className={labelCls}>Expected hours / period</span>
              <input
                type="number"
                min="1"
                max="120"
                className={`${inputCls} ${errors.expectedHours ? inputErrorCls : ''}`}
                value={form.expectedHours}
                data-testid="job-pay-hours-input"
                onChange={(e) => patch({ expectedHours: e.target.value })}
              />
              {errors.expectedHours && <p className={errorTextCls}>{errors.expectedHours}</p>}
            </label>
          )}
        </div>
      )}
    </section>
  )
}

// ---- Tax Withholding ---------------------------------------------------------

function TaxTab({ emp, onDirtyChange }: { emp: Employee; onDirtyChange: (d: boolean) => void }) {
  const updateEmployee = useStore((s) => s.updateEmployee)
  const toast = useStore((s) => s.toast)
  const [editing, setEditing] = useState(false)
  const w4 = emp.w4
  const [form, setForm] = useState(() => ({
    filingStatus: (w4?.filingStatus ?? 'single') as FilingStatus,
    dependentsAmt: String(w4?.dependentsAmt ?? 0),
    extraWithholding: String(w4?.extraWithholding ?? 0),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (emp.type === 'contractor') {
    return (
      <section className={`${cardCls} max-w-2xl p-5`} data-testid="tax-section">
        <h2 className="font-semibold text-slate-900">Tax Withholding</h2>
        <p className="mt-3 text-sm text-slate-600">
          {emp.name} is a 1099 contractor <InfoTip term="contractor1099" label="1099 contractor" /> — no taxes are withheld from
          their payments. They receive gross pay and handle their own taxes.
        </p>
      </section>
    )
  }

  function isDirty(next: typeof form) {
    return (
      next.filingStatus !== (w4?.filingStatus ?? 'single') ||
      next.dependentsAmt !== String(w4?.dependentsAmt ?? 0) ||
      next.extraWithholding !== String(w4?.extraWithholding ?? 0)
    )
  }

  function patch(p: Partial<typeof form>) {
    const next = { ...form, ...p }
    setForm(next)
    onDirtyChange(editing && isDirty(next))
  }

  function save() {
    const errs: Record<string, string> = {}
    if (Number.isNaN(Number(form.dependentsAmt)) || Number(form.dependentsAmt) < 0) errs.dependentsAmt = 'Must be $0 or more.'
    if (Number.isNaN(Number(form.extraWithholding)) || Number(form.extraWithholding) < 0) errs.extraWithholding = 'Must be $0 or more.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    updateEmployee(emp.id, {
      w4: {
        filingStatus: form.filingStatus,
        dependentsAmt: Number(form.dependentsAmt),
        extraWithholding: Number(form.extraWithholding),
      },
    })
    setEditing(false)
    onDirtyChange(false)
    toast('Tax withholding saved.')
  }

  function cancel() {
    setForm({
      filingStatus: w4?.filingStatus ?? 'single',
      dependentsAmt: String(w4?.dependentsAmt ?? 0),
      extraWithholding: String(w4?.extraWithholding ?? 0),
    })
    setErrors({})
    setEditing(false)
    onDirtyChange(false)
  }

  return (
    <section className={`${cardCls} max-w-2xl p-5`} data-testid="tax-section">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          Federal tax withholding (mock W-4)
          <InfoTip term="federalWithholding" label="federal withholding" />
        </h2>
        {!editing ? (
          <button className={btnSecondary} onClick={() => setEditing(true)} data-testid="tax-edit">
            <Icon name="edit" className="h-4 w-4" />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={cancel} data-testid="tax-cancel">
              Cancel
            </button>
            <button className={btnPrimary} onClick={save} data-testid="tax-save">
              Save
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <span className={labelCls}>
            Filing status
            <InfoTip term="filingStatus" label="filing status" />
          </span>
          {editing ? (
            <select
              className={selectCls}
              value={form.filingStatus}
              data-testid="tax-filing-status"
              onChange={(e) => patch({ filingStatus: e.target.value as FilingStatus })}
            >
              {(Object.keys(FILING_STATUS_LABELS) as FilingStatus[]).map((fs) => (
                <option key={fs} value={fs}>
                  {FILING_STATUS_LABELS[fs]}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-800" data-testid="tax-filing-status-value">
              {FILING_STATUS_LABELS[w4?.filingStatus ?? 'single']}
            </p>
          )}
        </div>
        <div>
          <span className={labelCls}>
            Dependents amount (annual $)
            <InfoTip term="dependentsAmt" label="dependents amount" />
          </span>
          {editing ? (
            <>
              <input
                type="number"
                min="0"
                step="500"
                className={`${inputCls} ${errors.dependentsAmt ? inputErrorCls : ''}`}
                value={form.dependentsAmt}
                data-testid="tax-dependents"
                onChange={(e) => patch({ dependentsAmt: e.target.value })}
              />
              {errors.dependentsAmt && <p className={errorTextCls}>{errors.dependentsAmt}</p>}
            </>
          ) : (
            <p className="text-sm text-slate-800" data-testid="tax-dependents-value">
              {fmtUSD((w4?.dependentsAmt ?? 0) * 100)}
            </p>
          )}
        </div>
        <div>
          <span className={labelCls}>
            Extra withholding (per paycheck $)
            <InfoTip term="extraWithholding" label="extra withholding" />
          </span>
          {editing ? (
            <>
              <input
                type="number"
                min="0"
                className={`${inputCls} ${errors.extraWithholding ? inputErrorCls : ''}`}
                value={form.extraWithholding}
                data-testid="tax-extra"
                onChange={(e) => patch({ extraWithholding: e.target.value })}
              />
              {errors.extraWithholding && <p className={errorTextCls}>{errors.extraWithholding}</p>}
            </>
          ) : (
            <p className="text-sm text-slate-800" data-testid="tax-extra-value">
              {fmtUSD((w4?.extraWithholding ?? 0) * 100)}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ---- Time Off ------------------------------------------------------------------

function TimeOffTab({ emp }: { emp: Employee }) {
  const requests = useStore((s) => s.ptoRequests)
  const mine = requests.filter((r) => r.employeeId === emp.id)

  // Deterministic mock accrual history + any session decisions.
  const history = useMemo(() => {
    const rows: { date: string; label: string; delta: string }[] = [
      { date: '2026-03-01', label: 'Monthly accrual', delta: '+10.0h' },
      { date: '2026-04-01', label: 'Monthly accrual', delta: '+10.0h' },
      { date: '2026-05-01', label: 'Monthly accrual', delta: '+10.0h' },
      { date: '2026-06-01', label: 'Monthly accrual', delta: '+10.0h' },
      { date: '2026-07-01', label: 'Monthly accrual', delta: '+10.0h' },
    ]
    mine
      .filter((r) => r.status === 'approved')
      .forEach((r) => rows.push({ date: r.startDate, label: `${PTO_TYPE_LABELS[r.type]} (approved)`, delta: `−${r.hours}.0h` }))
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [mine])

  if (emp.type === 'contractor') {
    return (
      <section className={`${cardCls} max-w-2xl p-5`}>
        <h2 className="font-semibold text-slate-900">Time Off</h2>
        <p className="mt-3 text-sm text-slate-600">Contractors don’t accrue paid time off in this demo.</p>
      </section>
    )
  }

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-[16rem_1fr]">
      <section className={`${cardCls} p-5`}>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          PTO balance
          <InfoTip term="ptoBalance" label="PTO balance" />
        </h2>
        <p className="mt-2 text-4xl font-bold text-slate-900" data-testid="pto-balance">
          {emp.ptoBalanceHrs}
          <span className="ml-1 text-base font-medium text-slate-500">hours</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">≈ {(emp.ptoBalanceHrs / 8).toFixed(1)} days · accrues 10h monthly</p>
        {mine.filter((r) => r.status === 'pending').length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {mine.filter((r) => r.status === 'pending').length} pending request(s) awaiting approval.
          </p>
        )}
      </section>
      <section className={`${cardCls} overflow-hidden`}>
        <h2 className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">Accrual history</h2>
        <table className="w-full" data-testid="accrual-history">
          <thead className="bg-slate-50">
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>Activity</th>
              <th className={`${thCls} text-right`}>Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((row, i) => (
              <tr key={i}>
                <td className={tdCls}>{fmtDate(row.date)}</td>
                <td className={tdCls}>{row.label}</td>
                <td className={`${tdCls} text-right tabular-nums ${row.delta.startsWith('−') ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {row.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mine.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requests</h3>
            <ul className="mt-2 space-y-1">
              {mine.map((r) => (
                <li key={r.id} className="text-sm text-slate-700">
                  {PTO_TYPE_LABELS[r.type]} · {fmtRange(r.startDate, r.endDate)} · {r.hours}h —{' '}
                  <span
                    className={
                      r.status === 'approved' ? 'font-medium text-emerald-700' : r.status === 'denied' ? 'font-medium text-rose-600' : 'font-medium text-amber-700'
                    }
                  >
                    {r.status}
                  </span>
                  {r.denyReason && <span className="text-slate-500"> — “{r.denyReason}”</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}

// ---- Documents ------------------------------------------------------------------

function DocumentsTab({ emp }: { emp: Employee }) {
  const docs =
    emp.type === 'w2'
      ? [
          { name: 'Offer letter.pdf', date: emp.hireDate, size: '182 KB' },
          { name: 'Form W-4.pdf', date: emp.hireDate, size: '96 KB' },
          { name: 'Direct deposit authorization.pdf', date: emp.hireDate, size: '74 KB' },
          { name: 'Employee handbook acknowledgment.pdf', date: emp.hireDate, size: '58 KB' },
        ]
      : [
          { name: 'Contractor agreement.pdf', date: emp.hireDate, size: '204 KB' },
          { name: 'Form W-9.pdf', date: emp.hireDate, size: '88 KB' },
        ]
  return (
    <section className={`${cardCls} max-w-2xl overflow-hidden`} data-testid="documents-section">
      <h2 className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-900">Documents</h2>
      <ul className="divide-y divide-slate-100">
        {docs.map((d) => (
          <li key={d.name} className="flex items-center gap-3 px-5 py-3">
            <Icon name="doc" className="h-5 w-5 text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-800">{d.name}</span>
            <span className="text-xs text-slate-500">
              {fmtDate(d.date)} · {d.size}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Static demo documents — downloads are disabled.</p>
    </section>
  )
}
