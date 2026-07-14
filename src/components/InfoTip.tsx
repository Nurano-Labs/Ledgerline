import { useId } from 'react'
import { Icon } from './Icon'

/**
 * ⓘ tooltip carrying a one-sentence plain-English definition of a domain term.
 * These are the narration source of truth for the tutorial agent, so the copy
 * lives in one dictionary (DEFINITIONS) and is exposed via data-testid.
 */

export const DEFINITIONS = {
  filingStatus:
    'Your federal tax filing category — single, married filing jointly, or head of household — which sets how much of each paycheck is shielded from withholding.',
  dependentsAmt:
    'An annual dollar credit for qualifying children and other dependents that reduces the federal tax withheld from each paycheck.',
  extraWithholding:
    'An additional flat dollar amount withheld from every paycheck on top of the calculated federal tax.',
  federalWithholding:
    'Money an employer holds back from each paycheck and sends to the IRS as a prepayment of the employee’s annual income tax.',
  stateWithholding: 'A flat 4% of gross pay withheld for state income tax in this demo.',
  socialSecurity: 'A 6.2% payroll tax that funds retirement and disability benefits; the employer pays a matching 6.2%.',
  medicare: 'A 1.45% payroll tax that funds hospital insurance for people 65 and older; the employer pays a matching 1.45%.',
  flsaExempt:
    'Marks a salaried employee as exempt from overtime pay under the Fair Labor Standards Act — exempt employees are paid the same regardless of hours worked.',
  routingNumber:
    'The 9-digit code that identifies a bank in the US payment system; its last digit is a checksum of the first eight.',
  accountNumber: 'The number identifying the specific bank account that will receive the deposit.',
  splitDeposit: 'Divides each paycheck across multiple accounts by percentage; the percentages must add up to exactly 100%.',
  w2Employee:
    'A regular employee: the company withholds taxes from each paycheck and reports wages on Form W-2 at year end.',
  contractor1099:
    'An independent contractor: paid gross with no tax withholding, and responsible for their own taxes via Form 1099.',
  grossPay: 'Total earnings for the pay period — base pay plus taxable additions like bonuses — before any taxes or deductions.',
  netPay: 'The take-home amount after all taxes and deductions are subtracted from gross pay.',
  benefitDeductions: 'The employee’s share of medical, dental, and vision premiums, deducted from each paycheck.',
  employerCost: 'What the pay run costs the company: gross wages plus the employer-matched Social Security and Medicare taxes.',
  ptoLiability: 'The estimated dollar value of unused paid-time-off hours the company would owe if everyone cashed out today.',
  ptoBalance: 'The paid-time-off hours this employee has accrued and not yet used.',
  overtime: 'Hours beyond the regular schedule, paid at 1.5× the hourly rate (time-and-a-half).',
  payPeriod: 'The date range of work this pay run covers; this company pays semi-monthly, on the 1st–15th and 16th–end of month.',
  bonus: 'A one-off taxable addition to this period’s gross pay.',
  reimbursement: 'A repayment of money the employee spent for the company; it is added after taxes because it isn’t income.',
  deduction: 'A one-off post-tax subtraction from this paycheck, like a charity pledge or equipment charge.',
} as const

export type TermKey = keyof typeof DEFINITIONS

export function InfoTip({ term, label }: { term: TermKey; label: string }) {
  const id = useId()
  return (
    <span className="group relative inline-flex">
      {/* A focusable span, not a button — InfoTips render inside card buttons. */}
      <span
        tabIndex={0}
        role="note"
        aria-label={`What is ${label}?`}
        aria-describedby={id}
        data-testid={`tooltip-trigger-${term}`}
        className="cursor-help rounded-full text-slate-400 hover:text-indigo-600 focus:text-indigo-600 focus:outline-none"
      >
        <Icon name="info" className="h-4 w-4" />
      </span>
      <span
        role="tooltip"
        id={id}
        data-testid={`tooltip-${term}`}
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-40 mb-2 w-72 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {DEFINITIONS[term]}
      </span>
    </span>
  )
}
