import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Department, Employee, MedicalPlan, PTORequest, PayRun } from './types'
import { MEDICAL_PLANS, seedEmployees, seedPayRuns, seedPtoRequests } from './data/seed'
import { CURRENT_PERIOD } from './data/period'
import {
  initialOnboarding,
  onboardingReducer,
  type OnboardingAction,
  type OnboardingState,
} from './wizards/onboarding'
import {
  buildRunLines,
  initialPayrollWizard,
  payableEmployees,
  payrollReducer,
  type PayrollAction,
  type PayrollWizardState,
} from './wizards/payrollRun'

export interface Toast {
  id: number
  message: string
}

interface AppState {
  employees: Employee[]
  payRuns: PayRun[]
  ptoRequests: PTORequest[]
  plans: MedicalPlan[]
  /** true until the Jun 16–30 run is processed */
  payrollDue: boolean
  lastProcessedRunId: string | null
  toasts: Toast[]

  onboarding: OnboardingState
  payrollWizard: PayrollWizardState

  resetAll: () => void
  toast: (message: string) => void
  dismissProcessedBanner: () => void

  updateEmployee: (id: string, patch: Partial<Employee>) => void
  addEmployee: (employee: Employee) => string
  terminateEmployees: (ids: string[]) => void
  changeDepartment: (ids: string[], department: Department) => void
  decidePto: (id: string, decision: 'approved' | 'denied', reason?: string) => void

  onboardingDispatch: (action: OnboardingAction) => void
  payrollDispatch: (action: PayrollAction) => void
  commitPayRun: () => PayRun
  nextEmployeeId: () => string
}

function seededState() {
  const employees = seedEmployees()
  return {
    employees,
    payRuns: seedPayRuns(employees),
    ptoRequests: seedPtoRequests(),
    plans: MEDICAL_PLANS,
    payrollDue: true,
    lastProcessedRunId: null as string | null,
    onboarding: initialOnboarding(),
    payrollWizard: initialPayrollWizard(),
  }
}

let toastSeq = 0

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  ...seededState(),
  toasts: [],

  resetAll: () => set({ ...seededState(), toasts: [] }),

  toast: (message) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },

  dismissProcessedBanner: () => set({ lastProcessedRunId: null }),

  updateEmployee: (id, patch) =>
    set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

  addEmployee: (employee) => {
    set((s) => ({ employees: [...s.employees, employee] }))
    return employee.id
  },

  terminateEmployees: (ids) =>
    set((s) => ({
      employees: s.employees.map((e) => (ids.includes(e.id) ? { ...e, status: 'Terminated' as const } : e)),
    })),

  changeDepartment: (ids, department) =>
    set((s) => ({
      employees: s.employees.map((e) => (ids.includes(e.id) ? { ...e, department } : e)),
    })),

  decidePto: (id, decision, reason) =>
    set((s) => {
      const request = s.ptoRequests.find((r) => r.id === id)
      if (!request || request.status !== 'pending') return s
      return {
        ptoRequests: s.ptoRequests.map((r) =>
          r.id === id ? { ...r, status: decision, denyReason: decision === 'denied' ? reason : undefined } : r,
        ),
        employees:
          decision === 'approved'
            ? s.employees.map((e) =>
                e.id === request.employeeId ? { ...e, ptoBalanceHrs: Math.max(0, e.ptoBalanceHrs - request.hours) } : e,
              )
            : s.employees,
      }
    }),

  onboardingDispatch: (action) => set((s) => ({ onboarding: onboardingReducer(s.onboarding, action) })),

  payrollDispatch: (action) => set((s) => ({ payrollWizard: payrollReducer(s.payrollWizard, action) })),

  /** Transactional: entity collections are only touched here, on final confirmation. */
  commitPayRun: () => {
    const s = get()
    const run: PayRun = {
      id: `run-${CURRENT_PERIOD.end}`,
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      payDate: CURRENT_PERIOD.payDate,
      status: 'processed',
      lines: buildRunLines(s.employees, s.payrollWizard, s.plans),
    }
    set({
      payRuns: [run, ...s.payRuns],
      payrollDue: false,
      lastProcessedRunId: run.id,
      payrollWizard: initialPayrollWizard(),
    })
    return run
  },

  nextEmployeeId: () => {
    const max = get().employees.reduce((m, e) => Math.max(m, Number(e.id.replace(/\D/g, '')) || 0), 0)
    return `e${String(max + 1).padStart(2, '0')}`
  },
    }),
    {
      // Session-only persistence: survives reloads/full navigations within the
      // tab, cleared when the tab closes. `?reset=1` restores the seed.
      name: 'ledgerline-session',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (s) => ({
        employees: s.employees,
        payRuns: s.payRuns,
        ptoRequests: s.ptoRequests,
        plans: s.plans,
        payrollDue: s.payrollDue,
        lastProcessedRunId: s.lastProcessedRunId,
        onboarding: s.onboarding,
        payrollWizard: s.payrollWizard,
      }),
    },
  ),
)

// ---- Convenience selectors -------------------------------------------------

export function employeeById(employees: Employee[], id: string | undefined): Employee | undefined {
  return employees.find((e) => e.id === id)
}

export function pendingPto(requests: PTORequest[]): PTORequest[] {
  return requests.filter((r) => r.status === 'pending')
}

export function activeHourlyIds(employees: Employee[]): string[] {
  return payableEmployees(employees)
    .filter((e) => e.comp.mode === 'hourly')
    .map((e) => e.id)
}

// Inspectable state for the tutorial harness.
declare global {
  interface Window {
    __ledgerline?: { getState: () => AppState }
  }
}
if (typeof window !== 'undefined') {
  window.__ledgerline = { getState: () => useStore.getState() }
}
