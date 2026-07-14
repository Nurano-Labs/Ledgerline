import type {
  Department,
  Employee,
  EmployeeStatus,
  FilingStatus,
  MedicalPlan,
  PTORequest,
  PayRun,
} from '../types'
import { HISTORICAL_PERIODS } from './period'
import { computePayLine, DEFAULT_HOURS } from './payroll'

/**
 * Deterministic seed — no randomness anywhere. Every derived field is a pure
 * function of the row index, so reloads (and `?reset=1`) always produce
 * identical data, down to the cent.
 *
 * Deliberate collisions for row-targeting tests: two employees are both named
 * "Jordan Lee" (Engineering vs. Sales), plus repeated surnames Lee and Nguyen.
 */

export const MEDICAL_PLANS: MedicalPlan[] = [
  { id: 'plan-bronze', name: 'Bluebird Basic HMO', perPaycheckCost: 6_200, tier: 'Bronze', deductible: '$6,000', network: 'HMO — regional' },
  { id: 'plan-silver', name: 'Bluebird Plus PPO', perPaycheckCost: 11_800, tier: 'Silver', deductible: '$3,000', network: 'PPO — national' },
  { id: 'plan-gold', name: 'Bluebird Premier PPO', perPaycheckCost: 17_400, tier: 'Gold', deductible: '$1,000', network: 'PPO — national' },
]

interface Row {
  name: string
  dept: Department
  /** 'c' = 1099 contractor */
  kind: 'w2' | 'c'
  /** 's' salary (annual $) or 'h' hourly (rate $/hr) */
  mode: 's' | 'h'
  amount: number
  hire: string
  status?: 'T' | 'O' // Terminated | Onboarding (default Active)
  nonExempt?: boolean // salaried default is FLSA-exempt
}

// Department heads are the first row of each department block.
const ROWS: Row[] = [
  // Engineering (14; 3 contractors)
  { name: 'Maya Okafor', dept: 'Engineering', kind: 'w2', mode: 's', amount: 210_000, hire: '2019-03-11' },
  { name: 'Jordan Lee', dept: 'Engineering', kind: 'w2', mode: 's', amount: 165_000, hire: '2021-08-02' },
  { name: 'Priya Natarajan', dept: 'Engineering', kind: 'w2', mode: 's', amount: 172_000, hire: '2020-10-19' },
  { name: 'Sam Whitfield', dept: 'Engineering', kind: 'w2', mode: 's', amount: 158_000, hire: '2022-04-25' },
  { name: 'Alex Kowalski', dept: 'Engineering', kind: 'w2', mode: 'h', amount: 62, hire: '2023-01-09' },
  { name: 'Dana Lee', dept: 'Engineering', kind: 'w2', mode: 's', amount: 149_000, hire: '2023-06-12' },
  { name: 'Chris Okonkwo', dept: 'Engineering', kind: 'w2', mode: 's', amount: 155_000, hire: '2022-09-06' },
  { name: 'Fatima al-Rashid', dept: 'Engineering', kind: 'w2', mode: 's', amount: 168_000, hire: '2021-02-15' },
  { name: 'Leo Martinez', dept: 'Engineering', kind: 'w2', mode: 'h', amount: 58, hire: '2024-03-04' },
  { name: 'Nina Petrova', dept: 'Engineering', kind: 'w2', mode: 's', amount: 176_000, hire: '2020-05-18' },
  { name: 'Jordan Patel', dept: 'Engineering', kind: 'w2', mode: 's', amount: 162_000, hire: '2023-11-27' },
  { name: 'Ravi Shah', dept: 'Engineering', kind: 'c', mode: 'h', amount: 95, hire: '2025-02-10' },
  { name: 'Elena Sokolova', dept: 'Engineering', kind: 'c', mode: 'h', amount: 110, hire: '2024-09-16' },
  { name: 'Tom Bradley', dept: 'Engineering', kind: 'c', mode: 'h', amount: 88, hire: '2025-06-02' },
  // Sales (9)
  { name: 'Marcus Webb', dept: 'Sales', kind: 'w2', mode: 's', amount: 185_000, hire: '2019-07-22' },
  { name: 'Jordan Lee', dept: 'Sales', kind: 'w2', mode: 's', amount: 118_000, hire: '2022-01-31' },
  { name: 'Aisha Thompson', dept: 'Sales', kind: 'w2', mode: 's', amount: 105_000, hire: '2023-03-20' },
  { name: 'Kyle Nguyen', dept: 'Sales', kind: 'w2', mode: 's', amount: 98_000, hire: '2024-06-10' },
  { name: 'Sofia Ramos', dept: 'Sales', kind: 'w2', mode: 's', amount: 112_000, hire: '2021-11-08' },
  { name: 'Derek Chan', dept: 'Sales', kind: 'w2', mode: 'h', amount: 34, hire: '2024-01-22' },
  { name: 'Holly Nguyen', dept: 'Sales', kind: 'w2', mode: 's', amount: 101_000, hire: '2023-08-14' },
  { name: 'Ben Foster', dept: 'Sales', kind: 'w2', mode: 's', amount: 96_000, hire: '2022-05-02', status: 'T' },
  { name: 'Grace Lee', dept: 'Sales', kind: 'w2', mode: 's', amount: 108_000, hire: '2020-12-07' },
  // Marketing (7; 2 contractors)
  { name: 'Ingrid Larsen', dept: 'Marketing', kind: 'w2', mode: 's', amount: 162_000, hire: '2020-02-24' },
  { name: 'Omar Haddad', dept: 'Marketing', kind: 'w2', mode: 's', amount: 92_000, hire: '2023-10-02' },
  { name: 'Lucy Tran', dept: 'Marketing', kind: 'w2', mode: 'h', amount: 31, hire: '2024-08-19' },
  { name: 'Felix Wagner', dept: 'Marketing', kind: 'w2', mode: 's', amount: 88_000, hire: '2022-07-11', nonExempt: true },
  { name: 'Rosa Delgado', dept: 'Marketing', kind: 'w2', mode: 's', amount: 95_000, hire: '2026-06-22', status: 'O' },
  { name: 'June Park', dept: 'Marketing', kind: 'c', mode: 'h', amount: 75, hire: '2025-04-07' },
  { name: 'Nikolai Volkov', dept: 'Marketing', kind: 'c', mode: 'h', amount: 82, hire: '2025-09-29' },
  // Operations (9; 1 contractor)
  { name: 'Diane Fontaine', dept: 'Operations', kind: 'w2', mode: 's', amount: 158_000, hire: '2019-10-14' },
  { name: 'Peter Gallagher', dept: 'Operations', kind: 'w2', mode: 'h', amount: 27, hire: '2022-11-28' },
  { name: 'Mei Sato', dept: 'Operations', kind: 'w2', mode: 'h', amount: 29, hire: '2023-04-17' },
  { name: 'Carlos Mendes', dept: 'Operations', kind: 'w2', mode: 'h', amount: 26, hire: '2024-05-13' },
  { name: 'Tanya Brooks', dept: 'Operations', kind: 'w2', mode: 's', amount: 78_000, hire: '2021-06-21', nonExempt: true },
  { name: 'Victor Osei', dept: 'Operations', kind: 'w2', mode: 'h', amount: 28, hire: '2023-09-25' },
  { name: 'Hannah Kim', dept: 'Operations', kind: 'w2', mode: 's', amount: 82_000, hire: '2022-02-14' },
  { name: 'Scott Reilly', dept: 'Operations', kind: 'w2', mode: 'h', amount: 25, hire: '2021-04-05', status: 'T' },
  { name: 'Dana Cruz', dept: 'Operations', kind: 'c', mode: 'h', amount: 55, hire: '2025-08-11' },
  // Finance (6; 1 contractor)
  { name: 'Robert Ashworth', dept: 'Finance', kind: 'w2', mode: 's', amount: 195_000, hire: '2019-01-07' },
  { name: 'Yuki Tanaka', dept: 'Finance', kind: 'w2', mode: 's', amount: 121_000, hire: '2021-09-13' },
  { name: 'Amara Diallo', dept: 'Finance', kind: 'w2', mode: 's', amount: 116_000, hire: '2022-08-29' },
  { name: 'Paul Zimmermann', dept: 'Finance', kind: 'w2', mode: 's', amount: 109_000, hire: '2020-08-03', status: 'T' },
  { name: 'Isabel Fuentes', dept: 'Finance', kind: 'w2', mode: 's', amount: 125_000, hire: '2026-06-29', status: 'O' },
  { name: 'George Malik', dept: 'Finance', kind: 'c', mode: 'h', amount: 90, hire: '2025-11-17' },
]

const STATUS: Record<string, EmployeeStatus> = { T: 'Terminated', O: 'Onboarding' }
const FILING: FilingStatus[] = ['single', 'married', 'head_of_household']
const DEPENDENTS = [0, 2000, 4000, 0, 2000]
const EXTRA_WH = [0, 0, 25, 0, 50]

function emailFor(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ +/g, '.')
  return `${slug}@ledgerline.dev`
}

function buildEmployees(): Employee[] {
  const headByDept = new Map<Department, string>()
  return ROWS.map((row, i) => {
    const id = `e${String(i + 1).padStart(2, '0')}`
    if (!headByDept.has(row.dept)) headByDept.set(row.dept, id)
    const isHead = headByDept.get(row.dept) === id
    const isW2 = row.kind === 'w2'
    // Give the duplicated "Jordan Lee" names distinct emails.
    const email = row.name === 'Jordan Lee' && row.dept === 'Sales' ? 'jordan.lee2@ledgerline.dev' : emailFor(row.name)

    const emp: Employee = {
      id,
      name: row.name,
      email,
      department: row.dept,
      managerId: isHead ? undefined : headByDept.get(row.dept),
      type: isW2 ? 'w2' : 'contractor',
      status: STATUS[row.status ?? ''] ?? 'Active',
      comp:
        row.mode === 's'
          ? { mode: 'salary', amount: row.amount, flsaExempt: !row.nonExempt }
          : { mode: 'hourly', amount: row.amount, expectedHours: 80 },
      ptoBalanceHrs: isW2 ? 24 + ((i * 13) % 96) : 0,
      hireDate: row.hire,
    }

    if (isW2) {
      emp.w4 = {
        filingStatus: FILING[i % 3],
        dependentsAmt: DEPENDENTS[i % 5],
        extraWithholding: EXTRA_WH[i % 5],
      }
      emp.directDeposit = {
        routing: '110000000', // mock ABA number that passes the checksum
        account: String(94_000_000 + ((i * 7919) % 1_000_000)),
        kind: i % 2 === 0 ? 'checking' : 'savings',
        ...(i % 9 === 4
          ? { splits: [
              { id: `sp-${id}-1`, label: 'Checking', percent: 80 },
              { id: `sp-${id}-2`, label: 'Savings', percent: 20 },
            ] }
          : {}),
      }
      emp.benefits = {
        medicalPlanId: i % 4 === 3 ? undefined : MEDICAL_PLANS[i % 3].id,
        dental: i % 2 === 0,
        vision: i % 3 === 0,
      }
    }
    return emp
  })
}

export function seedEmployees(): Employee[] {
  return buildEmployees()
}

/** Six processed historical runs covering all currently-active W-2 employees. */
export function seedPayRuns(employees: Employee[]): PayRun[] {
  const payable = employees.filter((e) => e.type === 'w2' && e.status === 'Active')
  return HISTORICAL_PERIODS.map((p) => ({
    id: `run-${p.end}`,
    periodStart: p.start,
    periodEnd: p.end,
    payDate: p.payDate,
    status: 'processed' as const,
    lines: payable.map((emp, idx) =>
      computePayLine(
        emp,
        emp.comp.mode === 'hourly' ? { regular: 80, ot: (idx % 3) * 2 } : DEFAULT_HOURS,
        [],
        MEDICAL_PLANS,
      ),
    ),
  }))
}

/**
 * Five pending requests. p1 and p2 are the engineered overlap: both are in
 * Engineering and their date ranges intersect (Jul 22–23).
 */
export function seedPtoRequests(): PTORequest[] {
  return [
    { id: 'pto-1', employeeId: 'e02', startDate: '2026-07-20', endDate: '2026-07-24', hours: 40, type: 'vacation', status: 'pending' },
    { id: 'pto-2', employeeId: 'e03', startDate: '2026-07-22', endDate: '2026-07-23', hours: 16, type: 'vacation', status: 'pending' },
    { id: 'pto-3', employeeId: 'e20', startDate: '2026-07-27', endDate: '2026-07-28', hours: 16, type: 'personal', status: 'pending' },
    { id: 'pto-4', employeeId: 'e33', startDate: '2026-08-03', endDate: '2026-08-07', hours: 40, type: 'vacation', status: 'pending' },
    { id: 'pto-5', employeeId: 'e25', startDate: '2026-07-16', endDate: '2026-07-16', hours: 8, type: 'sick', status: 'pending' },
  ]
}
