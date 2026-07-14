import type { Department, EmploymentType, FilingStatus } from '../types'
import { isValidRouting } from '../data/payroll'

/**
 * Onboarding wizard state machine — a small explicit reducer.
 * The step list is *derived from the employment-type choice* (step 2):
 *   W-2:        basics → type → comp → w4 → deposit → benefits → review   (7 steps)
 *   contractor: basics → type → comp → payment → review                   (5 steps)
 * Changing the type after later steps were touched clears the dependent steps
 * (the UI confirms first).
 */

export type OnboardingStepId = 'basics' | 'type' | 'comp' | 'w4' | 'deposit' | 'benefits' | 'payment' | 'review'

export const STEP_TITLES: Record<OnboardingStepId, string> = {
  basics: 'Basics',
  type: 'Employment type',
  comp: 'Compensation',
  w4: 'Federal tax withholding',
  deposit: 'Direct deposit',
  benefits: 'Benefits enrollment',
  payment: 'Payment details',
  review: 'Review & confirm',
}

export function stepsFor(type: EmploymentType | null): OnboardingStepId[] {
  return type === 'contractor'
    ? ['basics', 'type', 'comp', 'payment', 'review']
    : ['basics', 'type', 'comp', 'w4', 'deposit', 'benefits', 'review']
}

export interface SplitRow {
  id: string
  label: string
  percent: string
}

export interface OnboardingData {
  basics: { name: string; email: string; startDate: string; department: Department | ''; managerId: string }
  type: EmploymentType | null
  comp: { mode: 'salary' | 'hourly'; amount: string; flsaExempt: boolean; expectedHours: string }
  w4: { filingStatus: FilingStatus; dependentsAmt: string; extraWithholding: string }
  deposit: { routing: string; account: string; kind: 'checking' | 'savings'; splitEnabled: boolean; splits: SplitRow[] }
  benefits: { medicalPlanId: string | null; dental: boolean; vision: boolean }
  payment: { method: 'ach' | 'check'; routing: string; account: string }
}

export interface OnboardingState {
  active: boolean
  stepIndex: number
  /** steps whose data the user has touched — used for the clear-dependents warning */
  touched: Partial<Record<OnboardingStepId, boolean>>
  data: OnboardingData
}

function blankData(): OnboardingData {
  return {
    basics: { name: '', email: '', startDate: '2026-07-15', department: '', managerId: '' },
    type: null,
    comp: { mode: 'salary', amount: '', flsaExempt: true, expectedHours: '80' },
    w4: { filingStatus: 'single', dependentsAmt: '0', extraWithholding: '0' },
    deposit: { routing: '', account: '', kind: 'checking', splitEnabled: false, splits: [] },
    benefits: { medicalPlanId: null, dental: false, vision: false },
    payment: { method: 'ach', routing: '', account: '' },
  }
}

export function initialOnboarding(): OnboardingState {
  return { active: false, stepIndex: 0, touched: {}, data: blankData() }
}

/** The steps whose data depends on the employment-type choice. */
export const TYPE_DEPENDENT_STEPS: OnboardingStepId[] = ['comp', 'w4', 'deposit', 'benefits', 'payment']

export function hasDependentData(state: OnboardingState): boolean {
  return TYPE_DEPENDENT_STEPS.some((s) => state.touched[s])
}

export type OnboardingAction =
  | { type: 'START' }
  | { type: 'RESET' }
  | { type: 'GO_TO'; index: number }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'PATCH'; section: keyof OnboardingData; patch: Record<string, unknown> }
  | { type: 'SET_EMPLOYMENT_TYPE'; value: EmploymentType }
  | { type: 'DEEP_LINK'; step: number }

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'START':
      return state.active ? state : { ...initialOnboarding(), active: true }
    case 'RESET':
      return initialOnboarding()
    case 'GO_TO': {
      const steps = stepsFor(state.data.type)
      return { ...state, stepIndex: Math.max(0, Math.min(action.index, steps.length - 1)) }
    }
    case 'NEXT': {
      const steps = stepsFor(state.data.type)
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, steps.length - 1) }
    }
    case 'BACK':
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) }
    case 'PATCH': {
      const section = action.section
      if (section === 'type') return state // use SET_EMPLOYMENT_TYPE
      const current = state.data[section]
      return {
        ...state,
        active: true,
        touched: { ...state.touched, [section as OnboardingStepId]: true },
        data: { ...state.data, [section]: { ...(current as object), ...action.patch } },
      }
    }
    case 'SET_EMPLOYMENT_TYPE': {
      if (state.data.type === action.value) return state
      const changingAfterData = state.data.type !== null && hasDependentData(state)
      const blank = blankData()
      return {
        ...state,
        active: true,
        touched: changingAfterData ? { basics: state.touched.basics, type: true } : { ...state.touched, type: true },
        data: changingAfterData
          ? { ...blank, basics: state.data.basics, type: action.value }
          : { ...state.data, type: action.value },
      }
    }
    case 'DEEP_LINK': {
      // Canned mid-wizard draft so the harness can jump straight to any step.
      const data: OnboardingData = {
        basics: { name: 'Taylor Demo', email: 'taylor.demo@ledgerline.dev', startDate: '2026-07-15', department: 'Engineering', managerId: 'e01' },
        type: 'w2',
        comp: { mode: 'salary', amount: '95000', flsaExempt: true, expectedHours: '80' },
        w4: { filingStatus: 'single', dependentsAmt: '0', extraWithholding: '0' },
        deposit: { routing: '110000000', account: '94001122', kind: 'checking', splitEnabled: false, splits: [] },
        benefits: { medicalPlanId: 'plan-silver', dental: true, vision: false },
        payment: { method: 'ach', routing: '', account: '' },
      }
      const steps = stepsFor(data.type)
      const index = Math.max(0, Math.min(action.step - 1, steps.length - 1))
      const touched: OnboardingState['touched'] = {}
      steps.slice(0, index).forEach((s) => (touched[s] = true))
      return { active: true, stepIndex: index, touched, data }
    }
  }
}

// ---- Per-step validation -------------------------------------------------

export type StepErrors = Record<string, string>

export function validateStep(step: OnboardingStepId, data: OnboardingData): StepErrors {
  const errors: StepErrors = {}
  switch (step) {
    case 'basics': {
      const b = data.basics
      if (!b.name.trim()) errors.name = 'Full name is required.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) errors.email = 'Enter a valid email address.'
      if (!b.startDate) errors.startDate = 'Start date is required.'
      if (!b.department) errors.department = 'Choose a department.'
      if (!b.managerId) errors.managerId = 'Choose a manager.'
      break
    }
    case 'type':
      if (!data.type) errors.type = 'Choose an employment type to continue.'
      break
    case 'comp': {
      const c = data.comp
      const amount = Number(c.amount)
      if (!c.amount || Number.isNaN(amount) || amount <= 0) {
        errors.amount = c.mode === 'salary' ? 'Enter an annual salary greater than $0.' : 'Enter an hourly rate greater than $0.'
      }
      if (c.mode === 'hourly') {
        const hrs = Number(c.expectedHours)
        if (!c.expectedHours || Number.isNaN(hrs) || hrs <= 0 || hrs > 120) {
          errors.expectedHours = 'Expected hours per period must be between 1 and 120.'
        }
      }
      break
    }
    case 'w4': {
      const w = data.w4
      if (Number(w.dependentsAmt) < 0 || Number.isNaN(Number(w.dependentsAmt))) errors.dependentsAmt = 'Must be $0 or more.'
      if (Number(w.extraWithholding) < 0 || Number.isNaN(Number(w.extraWithholding))) errors.extraWithholding = 'Must be $0 or more.'
      break
    }
    case 'deposit': {
      const d = data.deposit
      if (!isValidRouting(d.routing)) errors.routing = 'Routing number must be 9 digits and pass the ABA checksum.'
      if (!/^\d{4,17}$/.test(d.account)) errors.account = 'Account number must be 4–17 digits.'
      if (d.splitEnabled) {
        if (d.splits.length < 2) errors.splits = 'Add at least two split rows.'
        const total = d.splits.reduce((s, r) => s + (Number(r.percent) || 0), 0)
        if (total !== 100) errors.splits = `Split percentages must sum to 100% (currently ${total}%).`
        if (d.splits.some((r) => !r.label.trim())) errors.splits = 'Every split row needs a label.'
      }
      break
    }
    case 'benefits':
      // Waiving medical is allowed; nothing is strictly required.
      break
    case 'payment': {
      const p = data.payment
      if (p.method === 'ach') {
        if (!isValidRouting(p.routing)) errors.routing = 'Routing number must be 9 digits and pass the ABA checksum.'
        if (!/^\d{4,17}$/.test(p.account)) errors.account = 'Account number must be 4–17 digits.'
      }
      break
    }
    case 'review':
      break
  }
  return errors
}
