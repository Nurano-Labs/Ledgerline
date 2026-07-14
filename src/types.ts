export type Department = 'Engineering' | 'Sales' | 'Marketing' | 'Operations' | 'Finance'

export const DEPARTMENTS: Department[] = ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance']

export type EmploymentType = 'w2' | 'contractor'
export type EmployeeStatus = 'Active' | 'Onboarding' | 'Terminated'
export type FilingStatus = 'single' | 'married' | 'head_of_household'

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single or married filing separately',
  married: 'Married filing jointly',
  head_of_household: 'Head of household',
}

export interface Comp {
  mode: 'salary' | 'hourly'
  /** salary: annual dollars; hourly: dollars per hour */
  amount: number
  /** salaried only */
  flsaExempt?: boolean
  /** hourly only: expected hours per pay period */
  expectedHours?: number
}

export interface W4 {
  filingStatus: FilingStatus
  /** annual dependents credit, dollars (W-4 step 3) */
  dependentsAmt: number
  /** extra dollars withheld per paycheck (W-4 step 4c) */
  extraWithholding: number
}

export interface DepositSplit {
  id: string
  label: string
  percent: number
}

export interface DirectDeposit {
  routing: string
  account: string
  kind: 'checking' | 'savings'
  splits?: DepositSplit[]
}

export interface BenefitElections {
  medicalPlanId?: string
  dental: boolean
  vision: boolean
}

export interface Employee {
  id: string
  name: string
  email: string
  department: Department
  managerId?: string
  type: EmploymentType
  status: EmployeeStatus
  comp: Comp
  w4?: W4
  directDeposit?: DirectDeposit
  benefits?: BenefitElections
  ptoBalanceHrs: number
  hireDate: string // ISO yyyy-mm-dd
}

export type AdjustmentType = 'bonus' | 'reimbursement' | 'deduction'

export interface Adjustment {
  id: string
  type: AdjustmentType
  /** cents */
  amount: number
  memo: string
}

/** All money fields are integer cents so results are deterministic to the cent. */
export interface PayLine {
  employeeId: string
  hours?: { regular: number; ot: number }
  adjustments: Adjustment[]
  gross: number
  fedWH: number
  stateWH: number
  socialSecurity: number
  medicare: number
  benefitDeductions: number
  net: number
}

export interface PayRun {
  id: string
  periodStart: string
  periodEnd: string
  payDate: string
  status: 'processed'
  lines: PayLine[]
}

export type PtoType = 'vacation' | 'sick' | 'personal'

export interface PTORequest {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  hours: number
  type: PtoType
  status: 'pending' | 'approved' | 'denied'
  denyReason?: string
}

export interface MedicalPlan {
  id: string
  name: string
  /** employee cost per paycheck, cents */
  perPaycheckCost: number
  tier: 'Bronze' | 'Silver' | 'Gold'
  deductible: string
  network: string
}
