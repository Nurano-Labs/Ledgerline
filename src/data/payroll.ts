import type { Adjustment, Employee, FilingStatus, MedicalPlan, PayLine } from '../types'

/**
 * MOCK tax formulas — intentionally simplified, documented for narration.
 * These are NOT real tax math (see the demo banner):
 *   Federal withholding = 12% × max(0, taxable gross − filing-status allowance − dependents credit / 24) + extra withholding
 *   State withholding   = flat 4% of taxable gross
 *   Social Security     = 6.2% of taxable gross
 *   Medicare            = 1.45% of taxable gross
 * All arithmetic is done in integer cents so every preview is deterministic to the cent.
 */
export const FED_RATE = 0.12
export const STATE_RATE = 0.04
export const SS_RATE = 0.062
export const MEDICARE_RATE = 0.0145
export const PERIODS_PER_YEAR = 24 // semi-monthly

/** Per-pay-period allowance shielded from federal withholding, in cents. */
export const ALLOWANCE_CENTS: Record<FilingStatus, number> = {
  single: 35_000,
  married: 60_000,
  head_of_household: 45_000,
}

export const DENTAL_COST_CENTS = 650
export const VISION_COST_CENTS = 325

export interface HoursEntry {
  regular: number
  ot: number
}

export const DEFAULT_HOURS: HoursEntry = { regular: 80, ot: 0 }

/** Per-period base pay in cents (before adjustments). */
export function basePayCents(emp: Employee, hours: HoursEntry): number {
  if (emp.comp.mode === 'salary') {
    return Math.round((emp.comp.amount * 100) / PERIODS_PER_YEAR)
  }
  const rateCents = Math.round(emp.comp.amount * 100)
  return Math.round(rateCents * hours.regular) + Math.round(rateCents * 1.5 * hours.ot)
}

export function benefitDeductionCents(emp: Employee, plans: MedicalPlan[]): number {
  const b = emp.benefits
  if (!b) return 0
  const plan = b.medicalPlanId ? plans.find((p) => p.id === b.medicalPlanId) : undefined
  return (plan?.perPaycheckCost ?? 0) + (b.dental ? DENTAL_COST_CENTS : 0) + (b.vision ? VISION_COST_CENTS : 0)
}

export function sumAdjustments(adjustments: Adjustment[], type: Adjustment['type']): number {
  return adjustments.filter((a) => a.type === type).reduce((s, a) => s + a.amount, 0)
}

export function computePayLine(
  emp: Employee,
  hours: HoursEntry,
  adjustments: Adjustment[],
  plans: MedicalPlan[],
): PayLine {
  const base = basePayCents(emp, hours)
  const bonuses = sumAdjustments(adjustments, 'bonus')
  const reimbursements = sumAdjustments(adjustments, 'reimbursement')
  const otherDeductions = sumAdjustments(adjustments, 'deduction')

  // Bonuses are taxable; reimbursements are added after tax; one-off deductions come out after tax.
  const gross = base + bonuses

  const w4 = emp.w4 ?? { filingStatus: 'single' as const, dependentsAmt: 0, extraWithholding: 0 }
  const allowance = ALLOWANCE_CENTS[w4.filingStatus]
  const dependentsCredit = Math.round((w4.dependentsAmt * 100) / PERIODS_PER_YEAR)
  const fedBase = Math.max(0, gross - allowance - dependentsCredit)
  const fedWH = Math.round(fedBase * FED_RATE) + w4.extraWithholding * 100

  const stateWH = Math.round(gross * STATE_RATE)
  const socialSecurity = Math.round(gross * SS_RATE)
  const medicare = Math.round(gross * MEDICARE_RATE)
  const benefitDeductions = benefitDeductionCents(emp, plans)

  const net = gross - fedWH - stateWH - socialSecurity - medicare - benefitDeductions + reimbursements - otherDeductions

  return {
    employeeId: emp.id,
    hours: emp.comp.mode === 'hourly' ? { ...hours } : undefined,
    adjustments: [...adjustments],
    gross,
    fedWH,
    stateWH,
    socialSecurity,
    medicare,
    benefitDeductions,
    net,
  }
}

/** Employer cost = gross + employer-matched Social Security + Medicare (mock). */
export function employerCostCents(line: PayLine): number {
  return line.gross + line.socialSecurity + line.medicare
}

export function totalOf(lines: PayLine[], key: 'gross' | 'net' | 'fedWH' | 'stateWH' | 'socialSecurity' | 'medicare' | 'benefitDeductions'): number {
  return lines.reduce((s, l) => s + l[key], 0)
}

/** ABA routing number checksum: 3(d1+d4+d7) + 7(d2+d5+d8) + (d3+d6+d9) ≡ 0 (mod 10). */
export function isValidRouting(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false
  const d = routing.split('').map(Number)
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10 === 0
}

/** Effective hourly-equivalent rate in cents (for PTO liability): salary / 2080, or the hourly rate. */
export function hourlyEquivalentCents(emp: Employee): number {
  return emp.comp.mode === 'salary' ? Math.round((emp.comp.amount * 100) / 2080) : Math.round(emp.comp.amount * 100)
}
