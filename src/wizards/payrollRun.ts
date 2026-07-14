import type { Adjustment, Employee, MedicalPlan, PayLine } from '../types'
import { computePayLine, DEFAULT_HOURS, type HoursEntry } from '../data/payroll'

/**
 * Run-payroll wizard state machine — explicit reducer.
 * Steps: 1 Review hours → 2 Adjustments → 3 Preview → 4 Approve.
 * Steps are strictly dependent: hours (1) and adjustments (2) feed the
 * preview math (3) via buildRunLines(), and the very same function builds the
 * committed pay run, so the preview always matches what gets processed.
 */

export interface PayrollWizardState {
  started: boolean
  step: 1 | 2 | 3 | 4
  /** keyed by employeeId; values are input strings so partial edits don't explode */
  hours: Record<string, { regular: string; ot: string }>
  adjustments: Record<string, Adjustment[]>
}

export function initialPayrollWizard(): PayrollWizardState {
  return { started: false, step: 1, hours: {}, adjustments: {} }
}

export type PayrollAction =
  | { type: 'START'; hourlyIds: string[] }
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'SET_HOURS'; employeeId: string; field: 'regular' | 'ot'; value: string }
  | { type: 'ADD_ADJUSTMENT'; employeeId: string; adjustment: Adjustment }
  | { type: 'REMOVE_ADJUSTMENT'; employeeId: string; adjustmentId: string }
  | { type: 'DEEP_LINK'; step: number; hourlyIds: string[] }

export function payrollReducer(state: PayrollWizardState, action: PayrollAction): PayrollWizardState {
  switch (action.type) {
    case 'START': {
      if (state.started) return state
      const hours: PayrollWizardState['hours'] = {}
      action.hourlyIds.forEach((id) => (hours[id] = { regular: '80', ot: '0' }))
      return { started: true, step: 1, hours, adjustments: {} }
    }
    case 'RESET':
      return initialPayrollWizard()
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_HOURS':
      return {
        ...state,
        hours: {
          ...state.hours,
          [action.employeeId]: { ...(state.hours[action.employeeId] ?? { regular: '80', ot: '0' }), [action.field]: action.value },
        },
      }
    case 'ADD_ADJUSTMENT':
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [action.employeeId]: [...(state.adjustments[action.employeeId] ?? []), action.adjustment],
        },
      }
    case 'REMOVE_ADJUSTMENT':
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [action.employeeId]: (state.adjustments[action.employeeId] ?? []).filter((a) => a.id !== action.adjustmentId),
        },
      }
    case 'DEEP_LINK': {
      const fresh = payrollReducer(initialPayrollWizard(), { type: 'START', hourlyIds: action.hourlyIds })
      const step = Math.max(1, Math.min(4, action.step)) as 1 | 2 | 3 | 4
      return { ...fresh, step }
    }
  }
}

/** Parse an hours input pair, treating blank/invalid as 0. */
export function parsedHours(state: PayrollWizardState, employeeId: string): HoursEntry {
  const h = state.hours[employeeId]
  if (!h) return DEFAULT_HOURS
  return { regular: Number(h.regular) || 0, ot: Number(h.ot) || 0 }
}

export function hoursError(state: PayrollWizardState, employeeId: string): string | null {
  const h = state.hours[employeeId]
  if (!h) return null
  const reg = Number(h.regular)
  const ot = Number(h.ot)
  if (h.regular === '' || Number.isNaN(reg) || reg < 0) return 'Enter regular hours (0–80).'
  if (reg > 80) return 'Regular hours can’t exceed 80 per period — move extra time to OT.'
  if (h.ot === '' || Number.isNaN(ot) || ot < 0) return 'Enter OT hours (0–40).'
  if (ot > 40) return 'Overtime is capped at 40 hours per period.'
  return null
}

/** Employees included in a pay run: active W-2 only (contractors are paid via AP). */
export function payableEmployees(employees: Employee[]): Employee[] {
  return employees.filter((e) => e.type === 'w2' && e.status === 'Active')
}

/** Single source of truth for run math — used by the Preview step AND the commit. */
export function buildRunLines(employees: Employee[], state: PayrollWizardState, plans: MedicalPlan[]): PayLine[] {
  return payableEmployees(employees).map((emp) =>
    computePayLine(
      emp,
      emp.comp.mode === 'hourly' ? parsedHours(state, emp.id) : DEFAULT_HOURS,
      state.adjustments[emp.id] ?? [],
      plans,
    ),
  )
}
