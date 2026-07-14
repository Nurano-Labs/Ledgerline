import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Department, Employee, EmploymentType, FilingStatus } from '../types'
import { DEPARTMENTS, FILING_STATUS_LABELS } from '../types'
import { useStore } from '../store'
import { fmtDate, fmtUSD } from '../data/format'
import { DENTAL_COST_CENTS, VISION_COST_CENTS } from '../data/payroll'
import {
  hasDependentData,
  STEP_TITLES,
  stepsFor,
  validateStep,
  type OnboardingStepId,
} from '../wizards/onboarding'
import { ConfirmDialog } from '../components/dialogs'
import { InfoTip } from '../components/InfoTip'
import { Icon } from '../components/Icon'
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  cardCls,
  errorTextCls,
  inputCls,
  inputErrorCls,
  labelCls,
  selectCls,
} from '../components/ui'

export function OnboardingWizard() {
  const state = useStore((s) => s.onboarding)
  const dispatch = useStore((s) => s.onboardingDispatch)
  const employees = useStore((s) => s.employees)
  const addEmployee = useStore((s) => s.addEmployee)
  const nextEmployeeId = useStore((s) => s.nextEmployeeId)
  const toast = useStore((s) => s.toast)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [showErrors, setShowErrors] = useState(false)
  const [pendingType, setPendingType] = useState<EmploymentType | null>(null)
  const [restartOpen, setRestartOpen] = useState(false)

  // Deep link (?step=N) or fresh start.
  useEffect(() => {
    const stepParam = searchParams.get('step')
    if (stepParam) {
      dispatch({ type: 'DEEP_LINK', step: Number(stepParam) || 1 })
      setSearchParams({}, { replace: true })
    } else if (!state.active) {
      dispatch({ type: 'START' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const steps = stepsFor(state.data.type)
  const stepId = steps[state.stepIndex]
  const errors = useMemo(() => validateStep(stepId, state.data), [stepId, state.data])
  const visibleErrors = showErrors ? errors : {}

  function goNext() {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    setShowErrors(false)
    dispatch({ type: 'NEXT' })
  }

  function goBack() {
    setShowErrors(false)
    dispatch({ type: 'BACK' })
  }

  function jumpTo(index: number) {
    setShowErrors(false)
    dispatch({ type: 'GO_TO', index })
  }

  function chooseType(value: EmploymentType) {
    if (state.data.type !== null && state.data.type !== value && hasDependentData(state)) {
      setPendingType(value)
      return
    }
    dispatch({ type: 'SET_EMPLOYMENT_TYPE', value })
  }

  function commit() {
    const d = state.data
    const id = nextEmployeeId()
    const isW2 = d.type === 'w2'
    const employee: Employee = {
      id,
      name: d.basics.name.trim(),
      email: d.basics.email.trim(),
      department: d.basics.department as Department,
      managerId: d.basics.managerId || undefined,
      type: d.type as EmploymentType,
      status: 'Onboarding',
      comp:
        d.comp.mode === 'salary'
          ? { mode: 'salary', amount: Number(d.comp.amount), flsaExempt: d.comp.flsaExempt }
          : { mode: 'hourly', amount: Number(d.comp.amount), expectedHours: Number(d.comp.expectedHours) },
      ptoBalanceHrs: 0,
      hireDate: d.basics.startDate,
    }
    if (isW2) {
      employee.w4 = {
        filingStatus: d.w4.filingStatus,
        dependentsAmt: Number(d.w4.dependentsAmt) || 0,
        extraWithholding: Number(d.w4.extraWithholding) || 0,
      }
      employee.directDeposit = {
        routing: d.deposit.routing,
        account: d.deposit.account,
        kind: d.deposit.kind,
        ...(d.deposit.splitEnabled
          ? { splits: d.deposit.splits.map((s) => ({ id: s.id, label: s.label, percent: Number(s.percent) || 0 })) }
          : {}),
      }
      employee.benefits = {
        medicalPlanId: d.benefits.medicalPlanId ?? undefined,
        dental: d.benefits.dental,
        vision: d.benefits.vision,
      }
    } else if (d.payment.method === 'ach') {
      employee.directDeposit = { routing: d.payment.routing, account: d.payment.account, kind: 'checking' }
    }
    addEmployee(employee)
    dispatch({ type: 'RESET' })
    toast(`${employee.name} added — onboarding started.`)
    navigate(`/people/${id}`)
  }

  const managers = employees.filter((e) => e.managerId === undefined && e.type === 'w2' && e.status === 'Active')

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add a new hire</h1>
          <p className="mt-1 text-sm text-slate-500">
            {state.data.type === 'contractor' ? '5-step contractor flow' : '7-step employee flow'} · progress is kept until you
            confirm
          </p>
        </div>
        <button className={btnGhost} onClick={() => setRestartOpen(true)} data-testid="wizard-restart">
          Start over
        </button>
      </div>

      {/* Stepper — a real navigation landmark so the agent can state where it is. */}
      <nav aria-label="Onboarding steps" className="mt-6">
        <ol className="flex flex-wrap gap-1.5" data-testid="onboarding-stepper">
          {steps.map((s, i) => {
            const isCurrent = i === state.stepIndex
            const isPast = i < state.stepIndex
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  disabled={!isPast && !isCurrent}
                  onClick={() => isPast && jumpTo(i)}
                  data-testid={`step-tab-${s}`}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isPast
                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      isCurrent ? 'bg-white/20' : isPast ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-white'
                    }`}
                  >
                    {isPast ? '✓' : i + 1}
                  </span>
                  {STEP_TITLES[s]}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className={`${cardCls} mt-5 p-6`} data-testid={`onboarding-step-${stepId}`}>
        {stepId === 'basics' && <BasicsStep errors={visibleErrors} managers={managers} />}
        {stepId === 'type' && <TypeStep errors={visibleErrors} onChoose={chooseType} />}
        {stepId === 'comp' && <CompStep errors={visibleErrors} />}
        {stepId === 'w4' && <W4Step errors={visibleErrors} />}
        {stepId === 'deposit' && <DepositStep errors={visibleErrors} />}
        {stepId === 'benefits' && <BenefitsStep />}
        {stepId === 'payment' && <PaymentStep errors={visibleErrors} />}
        {stepId === 'review' && <ReviewStep onJump={(s) => jumpTo(steps.indexOf(s))} />}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
          <button className={btnSecondary} onClick={goBack} disabled={state.stepIndex === 0} data-testid="wizard-back">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back
          </button>
          {stepId !== 'review' ? (
            <button className={btnPrimary} onClick={goNext} data-testid="wizard-next">
              Continue
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          ) : (
            <button className={btnPrimary} onClick={commit} data-testid="wizard-commit">
              <Icon name="check" className="h-4 w-4" />
              Add {state.data.type === 'contractor' ? 'contractor' : 'employee'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingType !== null}
        title="Change employment type?"
        body={
          <p>
            Switching to <strong>{pendingType === 'w2' ? 'W-2 employee' : '1099 contractor'}</strong> changes which steps apply,
            so your entries for compensation and the later steps will be <strong>cleared</strong>. Basics are kept.
          </p>
        }
        confirmLabel="Change type and clear steps"
        danger
        onCancel={() => setPendingType(null)}
        onConfirm={() => {
          if (pendingType) dispatch({ type: 'SET_EMPLOYMENT_TYPE', value: pendingType })
          setPendingType(null)
        }}
      />
      <ConfirmDialog
        open={restartOpen}
        title="Start over?"
        body="All entries in this wizard will be cleared. No employee has been created yet."
        confirmLabel="Clear and restart"
        danger
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET' })
          dispatch({ type: 'START' })
          setRestartOpen(false)
        }}
      />
    </div>
  )
}

// ---- Steps -----------------------------------------------------------------

type Errors = Record<string, string>

function useWizard() {
  const state = useStore((s) => s.onboarding)
  const dispatch = useStore((s) => s.onboardingDispatch)
  return { data: state.data, dispatch }
}

function ErrorMsg({ error }: { error?: string }) {
  return error ? <p className={errorTextCls}>{error}</p> : null
}

function BasicsStep({ errors, managers }: { errors: Errors; managers: Employee[] }) {
  const { data, dispatch } = useWizard()
  const b = data.basics
  const patch = (p: Partial<typeof b>) => dispatch({ type: 'PATCH', section: 'basics', patch: p })
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Basics</h2>
      <p className="mt-1 text-sm text-slate-500">Who is joining, when, and where they sit in the org.</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="col-span-2 block">
          <span className={labelCls}>Full name</span>
          <input
            className={`${inputCls} ${errors.name ? inputErrorCls : ''}`}
            value={b.name}
            placeholder="e.g. Riley Morgan"
            data-testid="basics-name"
            onChange={(e) => patch({ name: e.target.value })}
          />
          <ErrorMsg error={errors.name} />
        </label>
        <label className="block">
          <span className={labelCls}>Work email</span>
          <input
            type="email"
            className={`${inputCls} ${errors.email ? inputErrorCls : ''}`}
            value={b.email}
            placeholder="name@ledgerline.dev"
            data-testid="basics-email"
            onChange={(e) => patch({ email: e.target.value })}
          />
          <ErrorMsg error={errors.email} />
        </label>
        <label className="block">
          <span className={labelCls}>Start date</span>
          <input
            type="date"
            className={`${inputCls} ${errors.startDate ? inputErrorCls : ''}`}
            value={b.startDate}
            data-testid="basics-start-date"
            onChange={(e) => patch({ startDate: e.target.value })}
          />
          <ErrorMsg error={errors.startDate} />
        </label>
        <label className="block">
          <span className={labelCls}>Department</span>
          <select
            className={`${selectCls} ${errors.department ? inputErrorCls : ''}`}
            value={b.department}
            data-testid="basics-department"
            onChange={(e) => patch({ department: e.target.value as Department })}
          >
            <option value="">Choose…</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <ErrorMsg error={errors.department} />
        </label>
        <label className="block">
          <span className={labelCls}>Manager</span>
          <select
            className={`${selectCls} ${errors.managerId ? inputErrorCls : ''}`}
            value={b.managerId}
            data-testid="basics-manager"
            onChange={(e) => patch({ managerId: e.target.value })}
          >
            <option value="">Choose…</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.department}
              </option>
            ))}
          </select>
          <ErrorMsg error={errors.managerId} />
        </label>
      </div>
    </div>
  )
}

function TypeStep({ errors, onChoose }: { errors: Errors; onChoose: (t: EmploymentType) => void }) {
  const { data } = useWizard()
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Employment type</h2>
      <p className="mt-1 text-sm text-slate-500">
        This choice rewrites the remaining steps — contractors skip withholding, direct deposit, and benefits.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          data-testid="type-w2"
          aria-pressed={data.type === 'w2'}
          onClick={() => onChoose('w2')}
          className={`rounded-xl border-2 p-5 text-left transition-colors ${
            data.type === 'w2' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            W-2 employee
            <InfoTip term="w2Employee" label="W-2 employee" />
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            On payroll with tax withholding, direct deposit, and benefits. Adds steps 4–6.
          </span>
        </button>
        <button
          type="button"
          data-testid="type-contractor"
          aria-pressed={data.type === 'contractor'}
          onClick={() => onChoose('contractor')}
          className={`rounded-xl border-2 p-5 text-left transition-colors ${
            data.type === 'contractor' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            1099 contractor
            <InfoTip term="contractor1099" label="1099 contractor" />
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            Paid gross with no withholding. A simplified payment-details step replaces steps 4–6.
          </span>
        </button>
      </div>
      <ErrorMsg error={errors.type} />
    </div>
  )
}

function CompStep({ errors }: { errors: Errors }) {
  const { data, dispatch } = useWizard()
  const c = data.comp
  const patch = (p: Partial<typeof c>) => dispatch({ type: 'PATCH', section: 'comp', patch: p })
  const isContractor = data.type === 'contractor'
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Compensation</h2>
      <p className="mt-1 text-sm text-slate-500">
        {isContractor ? 'How this contractor bills their time.' : 'Salaried or hourly — the fields change with the toggle.'}
      </p>
      <div className="mt-5 flex rounded-lg border border-slate-300 p-0.5" role="radiogroup" aria-label="Pay basis">
        {(['salary', 'hourly'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={c.mode === mode}
            data-testid={`comp-mode-${mode}`}
            onClick={() => patch({ mode })}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${
              c.mode === mode ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {mode === 'salary' ? 'Salary' : 'Hourly'}
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>{c.mode === 'salary' ? 'Annual amount ($)' : 'Hourly rate ($)'}</span>
          <input
            type="number"
            min="0"
            className={`${inputCls} ${errors.amount ? inputErrorCls : ''}`}
            value={c.amount}
            placeholder={c.mode === 'salary' ? '95000' : '45'}
            data-testid="comp-amount"
            onChange={(e) => patch({ amount: e.target.value })}
          />
          <ErrorMsg error={errors.amount} />
        </label>
        {c.mode === 'hourly' && (
          <label className="block">
            <span className={labelCls}>Expected hours / pay period</span>
            <input
              type="number"
              min="1"
              max="120"
              className={`${inputCls} ${errors.expectedHours ? inputErrorCls : ''}`}
              value={c.expectedHours}
              data-testid="comp-hours"
              onChange={(e) => patch({ expectedHours: e.target.value })}
            />
            <ErrorMsg error={errors.expectedHours} />
          </label>
        )}
        {c.mode === 'salary' && !isContractor && (
          <label className="flex items-end gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={c.flsaExempt}
              data-testid="comp-flsa"
              onChange={(e) => patch({ flsaExempt: e.target.checked })}
            />
            FLSA exempt
            <InfoTip term="flsaExempt" label="FLSA exempt" />
          </label>
        )}
      </div>
      {c.mode === 'salary' && c.amount && !errors.amount && (
        <p className="mt-3 text-sm text-slate-500" data-testid="comp-per-period">
          ≈ {fmtUSD(Math.round((Number(c.amount) * 100) / 24))} per semi-monthly paycheck
        </p>
      )}
    </div>
  )
}

function W4Step({ errors }: { errors: Errors }) {
  const { data, dispatch } = useWizard()
  const w = data.w4
  const patch = (p: Partial<typeof w>) => dispatch({ type: 'PATCH', section: 'w4', patch: p })
  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        Federal tax withholding
        <InfoTip term="federalWithholding" label="federal withholding" />
      </h2>
      <p className="mt-1 text-sm text-slate-500">A mock W-4 — these choices set how much tax comes out of each paycheck.</p>
      <div className="mt-5 grid gap-4">
        <label className="block">
          <span className={labelCls}>
            Filing status
            <InfoTip term="filingStatus" label="filing status" />
          </span>
          <select
            className={selectCls}
            value={w.filingStatus}
            data-testid="w4-filing-status"
            onChange={(e) => patch({ filingStatus: e.target.value as FilingStatus })}
          >
            {(Object.keys(FILING_STATUS_LABELS) as FilingStatus[]).map((fs) => (
              <option key={fs} value={fs}>
                {FILING_STATUS_LABELS[fs]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>
            Dependents amount (annual $)
            <InfoTip term="dependentsAmt" label="dependents amount" />
          </span>
          <input
            type="number"
            min="0"
            step="500"
            className={`${inputCls} ${errors.dependentsAmt ? inputErrorCls : ''}`}
            value={w.dependentsAmt}
            data-testid="w4-dependents"
            onChange={(e) => patch({ dependentsAmt: e.target.value })}
          />
          <ErrorMsg error={errors.dependentsAmt} />
        </label>
        <label className="block">
          <span className={labelCls}>
            Extra withholding (per paycheck $)
            <InfoTip term="extraWithholding" label="extra withholding" />
          </span>
          <input
            type="number"
            min="0"
            className={`${inputCls} ${errors.extraWithholding ? inputErrorCls : ''}`}
            value={w.extraWithholding}
            data-testid="w4-extra"
            onChange={(e) => patch({ extraWithholding: e.target.value })}
          />
          <ErrorMsg error={errors.extraWithholding} />
        </label>
      </div>
    </div>
  )
}

function DepositStep({ errors }: { errors: Errors }) {
  const { data, dispatch } = useWizard()
  const d = data.deposit
  const patch = (p: Partial<typeof d>) => dispatch({ type: 'PATCH', section: 'deposit', patch: p })
  const splitTotal = d.splits.reduce((s, r) => s + (Number(r.percent) || 0), 0)

  function addSplit() {
    patch({
      splits: [...d.splits, { id: `split-${d.splits.length + 1}-${d.splits.map((s) => s.id).join('').length}`, label: '', percent: '' }],
    })
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Direct deposit</h2>
      <p className="mt-1 text-sm text-slate-500">Where paychecks land. Use any 9-digit routing number that passes the checksum — e.g. 110000000.</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <label className="block">
          <span className={labelCls}>
            Routing number
            <InfoTip term="routingNumber" label="routing number" />
          </span>
          <input
            inputMode="numeric"
            maxLength={9}
            className={`${inputCls} font-mono ${errors.routing ? inputErrorCls : ''}`}
            value={d.routing}
            placeholder="110000000"
            data-testid="deposit-routing"
            onChange={(e) => patch({ routing: e.target.value.replace(/\D/g, '') })}
          />
          <ErrorMsg error={errors.routing} />
        </label>
        <label className="block">
          <span className={labelCls}>
            Account number
            <InfoTip term="accountNumber" label="account number" />
          </span>
          <input
            inputMode="numeric"
            maxLength={17}
            className={`${inputCls} font-mono ${errors.account ? inputErrorCls : ''}`}
            value={d.account}
            placeholder="94001122"
            data-testid="deposit-account"
            onChange={(e) => patch({ account: e.target.value.replace(/\D/g, '') })}
          />
          <ErrorMsg error={errors.account} />
        </label>
        <fieldset className="col-span-2">
          <legend className={labelCls}>Account type</legend>
          <div className="flex gap-4">
            {(['checking', 'savings'] as const).map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="deposit-kind"
                  className="accent-indigo-600"
                  checked={d.kind === kind}
                  data-testid={`deposit-kind-${kind}`}
                  onChange={() => patch({ kind })}
                />
                {kind}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-600"
            checked={d.splitEnabled}
            data-testid="deposit-split-toggle"
            onChange={(e) =>
              patch({
                splitEnabled: e.target.checked,
                splits: e.target.checked
                  ? d.splits.length
                    ? d.splits
                    : [
                        { id: 'split-a', label: 'Checking', percent: '80' },
                        { id: 'split-b', label: 'Savings', percent: '20' },
                      ]
                  : d.splits,
              })
            }
          />
          Split this deposit across accounts
          <InfoTip term="splitDeposit" label="split deposit" />
        </label>
      </div>

      {d.splitEnabled && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4" data-testid="deposit-splits">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Split percentages</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                splitTotal === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
              data-testid="split-total"
            >
              Total: {splitTotal}% {splitTotal === 100 ? '✓' : '(must equal 100%)'}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {d.splits.map((row, i) => (
              <div key={row.id} className="flex items-center gap-2">
                <input
                  aria-label={`Split ${i + 1} label`}
                  placeholder="Account nickname"
                  className={`${inputCls} flex-1`}
                  value={row.label}
                  data-testid={`split-label-${i}`}
                  onChange={(e) =>
                    patch({ splits: d.splits.map((s) => (s.id === row.id ? { ...s, label: e.target.value } : s)) })
                  }
                />
                <div className="relative w-28">
                  <input
                    aria-label={`Split ${i + 1} percent`}
                    inputMode="numeric"
                    className={`${inputCls} pr-7 text-right`}
                    value={row.percent}
                    data-testid={`split-percent-${i}`}
                    onChange={(e) =>
                      patch({ splits: d.splits.map((s) => (s.id === row.id ? { ...s, percent: e.target.value.replace(/\D/g, '') } : s)) })
                    }
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">%</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove split ${i + 1}`}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  data-testid={`split-remove-${i}`}
                  onClick={() => patch({ splits: d.splits.filter((s) => s.id !== row.id) })}
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className={`${btnGhost} mt-2`} onClick={addSplit} data-testid="split-add">
            <Icon name="plus" className="h-4 w-4" />
            Add split row
          </button>
          <ErrorMsg error={errors.splits} />
        </div>
      )}
    </div>
  )
}

function BenefitsStep() {
  const { data, dispatch } = useWizard()
  const plans = useStore((s) => s.plans)
  const b = data.benefits
  const patch = (p: Partial<typeof b>) => dispatch({ type: 'PATCH', section: 'benefits', patch: p })
  const plan = plans.find((p) => p.id === b.medicalPlanId)
  const total = (plan?.perPaycheckCost ?? 0) + (b.dental ? DENTAL_COST_CENTS : 0) + (b.vision ? VISION_COST_CENTS : 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_14rem]">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Benefits enrollment</h2>
        <p className="mt-1 text-sm text-slate-500">Pick a medical plan (or waive), then add dental and vision riders.</p>
        <div className="mt-5 space-y-3" role="radiogroup" aria-label="Medical plan">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={b.medicalPlanId === p.id}
              data-testid={`benefits-plan-${p.id}`}
              onClick={() => patch({ medicalPlanId: p.id })}
              className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left ${
                b.medicalPlanId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>
                <span className="font-semibold text-slate-900">{p.name}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {p.tier} · deductible {p.deductible}
                </span>
              </span>
              <span className="font-semibold tabular-nums text-slate-900">{fmtUSD(p.perPaycheckCost)}/check</span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={b.medicalPlanId === null}
            data-testid="benefits-plan-waive"
            onClick={() => patch({ medicalPlanId: null })}
            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left ${
              b.medicalPlanId === null ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="font-semibold text-slate-900">Waive medical coverage</span>
            <span className="font-semibold tabular-nums text-slate-900">$0.00/check</span>
          </button>
        </div>
        <div className="mt-5 flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={b.dental}
              data-testid="benefits-dental"
              onChange={(e) => patch({ dental: e.target.checked })}
            />
            Dental ({fmtUSD(DENTAL_COST_CENTS)}/check)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={b.vision}
              data-testid="benefits-vision"
              onChange={(e) => patch({ vision: e.target.checked })}
            />
            Vision ({fmtUSD(VISION_COST_CENTS)}/check)
          </label>
        </div>
      </div>
      {/* Live summary sidebar */}
      <aside className="h-fit rounded-xl bg-slate-50 p-4" aria-label="Estimated deductions" data-testid="benefits-summary">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per-paycheck deductions</h3>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Medical</dt>
            <dd className="tabular-nums">{fmtUSD(plan?.perPaycheckCost ?? 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Dental</dt>
            <dd className="tabular-nums">{fmtUSD(b.dental ? DENTAL_COST_CENTS : 0)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Vision</dt>
            <dd className="tabular-nums">{fmtUSD(b.vision ? VISION_COST_CENTS : 0)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="benefits-total">
              {fmtUSD(total)}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}

function PaymentStep({ errors }: { errors: Errors }) {
  const { data, dispatch } = useWizard()
  const p = data.payment
  const patch = (patchObj: Partial<typeof p>) => dispatch({ type: 'PATCH', section: 'payment', patch: patchObj })
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Payment details</h2>
      <p className="mt-1 text-sm text-slate-500">
        Contractors are paid gross via accounts payable — no withholding, no benefits.
      </p>
      <fieldset className="mt-5">
        <legend className={labelCls}>Payment method</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="payment-method"
              className="accent-indigo-600"
              checked={p.method === 'ach'}
              data-testid="payment-method-ach"
              onChange={() => patch({ method: 'ach' })}
            />
            ACH bank transfer
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="payment-method"
              className="accent-indigo-600"
              checked={p.method === 'check'}
              data-testid="payment-method-check"
              onChange={() => patch({ method: 'check' })}
            />
            Paper check
          </label>
        </div>
      </fieldset>
      {p.method === 'ach' && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>
              Routing number
              <InfoTip term="routingNumber" label="routing number" />
            </span>
            <input
              inputMode="numeric"
              maxLength={9}
              className={`${inputCls} font-mono ${errors.routing ? inputErrorCls : ''}`}
              value={p.routing}
              placeholder="110000000"
              data-testid="payment-routing"
              onChange={(e) => patch({ routing: e.target.value.replace(/\D/g, '') })}
            />
            <ErrorMsg error={errors.routing} />
          </label>
          <label className="block">
            <span className={labelCls}>Account number</span>
            <input
              inputMode="numeric"
              maxLength={17}
              className={`${inputCls} font-mono ${errors.account ? inputErrorCls : ''}`}
              value={p.account}
              data-testid="payment-account"
              onChange={(e) => patch({ account: e.target.value.replace(/\D/g, '') })}
            />
            <ErrorMsg error={errors.account} />
          </label>
        </div>
      )}
      {p.method === 'check' && (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Checks are mailed to the contractor’s address on file after each approved invoice.
        </p>
      )}
    </div>
  )
}

function ReviewStep({ onJump }: { onJump: (s: OnboardingStepId) => void }) {
  const { data } = useWizard()
  const employees = useStore((s) => s.employees)
  const plans = useStore((s) => s.plans)
  const isW2 = data.type === 'w2'
  const manager = employees.find((e) => e.id === data.basics.managerId)
  const plan = plans.find((p) => p.id === data.benefits.medicalPlanId)

  function Section({ step, title, rows }: { step: OnboardingStepId; title: string; rows: [string, string][] }) {
    return (
      <section className="rounded-lg border border-slate-200 p-4" data-testid={`review-${step}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            onClick={() => onJump(step)}
            data-testid={`review-edit-${step}`}
          >
            Edit
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-sm text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Review & confirm</h2>
      <p className="mt-1 text-sm text-slate-500">
        Everything below comes from the earlier steps — nothing is saved until you click “Add{' '}
        {isW2 ? 'employee' : 'contractor'}”.
      </p>
      <div className="mt-5 space-y-3">
        <Section
          step="basics"
          title="Basics"
          rows={[
            ['Name', data.basics.name],
            ['Email', data.basics.email],
            ['Start date', data.basics.startDate ? fmtDate(data.basics.startDate) : '—'],
            ['Department', data.basics.department || '—'],
            ['Manager', manager?.name ?? '—'],
          ]}
        />
        <Section step="type" title="Employment type" rows={[['Type', isW2 ? 'W-2 employee' : '1099 contractor']]} />
        <Section
          step="comp"
          title="Compensation"
          rows={
            data.comp.mode === 'salary'
              ? [
                  ['Basis', 'Salaried'],
                  ['Annual amount', data.comp.amount ? fmtUSD(Number(data.comp.amount) * 100) : '—'],
                  ...(isW2 ? ([['FLSA status', data.comp.flsaExempt ? 'Exempt' : 'Non-exempt']] as [string, string][]) : []),
                ]
              : [
                  ['Basis', 'Hourly'],
                  ['Rate', data.comp.amount ? `${fmtUSD(Number(data.comp.amount) * 100)}/hr` : '—'],
                  ['Expected hours / period', `${data.comp.expectedHours}h`],
                ]
          }
        />
        {isW2 && (
          <>
            <Section
              step="w4"
              title="Federal tax withholding"
              rows={[
                ['Filing status', FILING_STATUS_LABELS[data.w4.filingStatus]],
                ['Dependents amount', fmtUSD((Number(data.w4.dependentsAmt) || 0) * 100)],
                ['Extra withholding', `${fmtUSD((Number(data.w4.extraWithholding) || 0) * 100)}/check`],
              ]}
            />
            <Section
              step="deposit"
              title="Direct deposit"
              rows={[
                ['Routing', data.deposit.routing || '—'],
                ['Account', data.deposit.account ? `••••${data.deposit.account.slice(-4)} (${data.deposit.kind})` : '—'],
                [
                  'Split',
                  data.deposit.splitEnabled
                    ? data.deposit.splits.map((s) => `${s.label} ${s.percent}%`).join(' · ')
                    : 'No split — 100% to one account',
                ],
              ]}
            />
            <Section
              step="benefits"
              title="Benefits"
              rows={[
                ['Medical', plan ? `${plan.name} (${fmtUSD(plan.perPaycheckCost)}/check)` : 'Waived'],
                ['Dental', data.benefits.dental ? 'Enrolled' : 'Declined'],
                ['Vision', data.benefits.vision ? 'Enrolled' : 'Declined'],
              ]}
            />
          </>
        )}
        {!isW2 && (
          <Section
            step="payment"
            title="Payment details"
            rows={
              data.payment.method === 'ach'
                ? [
                    ['Method', 'ACH bank transfer'],
                    ['Routing', data.payment.routing || '—'],
                    ['Account', data.payment.account ? `••••${data.payment.account.slice(-4)}` : '—'],
                  ]
                : [['Method', 'Paper check']]
            }
          />
        )}
      </div>
    </div>
  )
}
