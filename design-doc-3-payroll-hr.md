# Design Doc — "Ledgerline" Payroll & HR Mock App

**Tier:** Complex (dense data tables, dependent multi-step wizards, conditional forms, domain jargon, gated confirmations)
**Type:** Frontend-only UI mock, no backend, mock data in-memory, state persists only for the session

---

## 1. Purpose

Ledgerline is a mock Gusto/ADP-style payroll and HR platform, the *complex* target for the tutorial-recording agent. Its difficulty is not raw widget count but *coupling*: wizard steps depend on earlier inputs, forms branch on employee type, tables demand precise row-level targeting, and correct narration requires domain understanding (the agent should be able to say what "federal withholding" is while pointing at it, not just click it).

Success criteria: the agent completes long (15–25 step) dependent workflows without dead-ends, targets the correct row among visually similar rows, and produces narration that explains domain concepts, not just UI mechanics.

## 2. Non-Goals

No real tax math (calculations use simplified, clearly-labeled mock formulas), no document generation, no e-signature, no auth. All money and PII are obviously fake. A persistent "Demo data — not real tax advice" banner avoids any implication of real payroll guidance.

## 3. Tech Stack

React + Vite + React Router + Zustand + Tailwind, consistent with the other tiers. Tables via TanStack Table (sorting, pagination, row selection, inline edit). Wizard state machines via a small explicit reducer per wizard — wizards are the heart of this app and deserve first-class, inspectable state. Deterministic seed, hardcoded reference date (2026-07-01), fixed pay-period calendar derived from it.

## 4. Information Architecture

```
/dashboard                     KPIs, upcoming pay run, pending approvals
/people                        Employee directory (the flagship data table)
/people/:id                    Employee profile (tabbed)
/people/new                    Onboarding wizard (5–7 dependent steps)
/payroll                       Pay-run history table
/payroll/run                   "Run payroll" wizard (4 steps)
/time-off                      PTO request approval queue
/benefits                      Plan cards + enrollment status table
/reports                       Report builder (type, date range, export)
/settings/company              Legal entity, pay schedule, work locations
```

Left sidebar navigation with section grouping; top bar with global search (typeahead over employees) and a notification bell whose badge count reflects pending approvals.

## 5. Screens & Key Components

### 5.1 Employee Directory (`/people`)
The flagship table: 45 seeded employees, columns for name/avatar, department, employment type (W-2 employee vs. 1099 contractor), status (Active, Onboarding, Terminated), compensation, start date. Features: column sorting, text search, faceted filters (department, type, status), pagination (20/page), row checkboxes with a bulk-action bar (change department, export selected, terminate — the latter gated behind a type-the-name confirmation dialog). Several employees share surnames deliberately, so "open Jordan Lee in Engineering" requires disambiguation.

### 5.2 Employee Profile (`/people/:id`)
Tabs: Overview, Job & Pay (editable with an explicit Edit → Save/Cancel mode, inline validation, unsaved-changes guard on navigation), Tax Withholding (mock W-4: filing status select, dependents amount, extra withholding — each field has an ⓘ tooltip with a one-sentence plain-English definition the agent can read aloud), Time Off (balances + accrual history), Documents (static mock list).

### 5.3 Onboarding Wizard (`/people/new`)
The signature *conditional* flow. Stepper across the top; steps:

1. **Basics** — name, email, start date, department, manager select.
2. **Employment type** — W-2 employee or 1099 contractor. *This choice rewrites the remaining steps*: contractors skip steps 4–6 and see a simplified "Payment details" step instead.
3. **Compensation** — salary vs. hourly toggle changes the fields (annual amount vs. rate + expected hours); FLSA-exempt checkbox appears only for salaried.
4. **Federal tax withholding (W-2 only)** — mock W-4 fields mirroring §5.2's tooltips.
5. **Direct deposit (W-2 only)** — routing number (9-digit validation with mock checksum), account number, account-type radio, optional split-deposit percentage rows that must sum to 100% (live validation).
6. **Benefits enrollment (W-2 only)** — medical plan radio cards with per-paycheck cost, dental/vision toggles; a summary sidebar recalculates estimated per-paycheck deductions as choices change.
7. **Review & confirm** — read-only summary of every prior step with per-section Edit links that jump back into the wizard; "Add employee" commits and lands on the new profile with an Onboarding status badge.

Back-navigation preserves entered data; changing step 2 after completing later steps shows a warning that dependent steps will be cleared.

### 5.4 Run Payroll Wizard (`/payroll/run`)
Four steps over a persistent pay-period header ("Jun 16 – Jun 30, 2026 · Pay date Jul 3"):

1. **Review hours** — editable table of hourly employees (regular/OT hours inline-editable, ≤80 regular-hour validation); salaried employees listed read-only below.
2. **Adjustments** — per-employee one-off additions (bonus, reimbursement) and deductions via an "Add adjustment" row-level popover; running totals update live.
3. **Preview** — computed table per employee: gross → federal withholding → state withholding → Social Security → Medicare → benefit deductions → **net pay**, using simplified mock formulas. Expandable row detail shows the line-item math. Footer totals: total gross, total employer cost, total net.
4. **Approve** — summary card + confirmation dialog requiring a typed "APPROVE". Commits a pay run to history, marked Processed, and clears the dashboard's "payroll due" alert.

Steps are strictly dependent: edits in step 1–2 must visibly change step 3's numbers, which is both the hardest state test and the best narration moment ("notice the net pay update after the bonus").

### 5.5 Time-Off Queue (`/time-off`)
Pending request cards (employee, dates, type, remaining balance, overlap warning if two teammates in the same department overlap). Approve/Deny; deny requires a reason textarea. Decisions update the employee profile balance and decrement the notification badge.

### 5.6 Reports (`/reports`)
Three-panel builder: report type list (Payroll summary, PTO liability, Headcount), parameter form (date-range picker, department multi-select, group-by radio), and a Generate button producing an in-page table plus a real CSV download assembled client-side — giving tutorials a genuine "export" ending beat.

## 6. Mock Data Model

```ts
Employee   { id, name, email, department, managerId?, type: 'w2'|'contractor',
             status, comp: {mode:'salary'|'hourly', amount, flsaExempt?},
             w4?: {filingStatus, dependentsAmt, extraWithholding},
             directDeposit?: {routing, account, kind, splits?[]},
             benefits?: {medicalPlanId?, dental, vision},
             ptoBalanceHrs, hireDate }
PayRun     { id, periodStart, periodEnd, payDate, status:'processed',
             lines: PayLine[] }
PayLine    { employeeId, hours?, adjustments[], gross, fedWH, stateWH,
             socialSecurity, medicare, benefitDeductions, net }
PTORequest { id, employeeId, startDate, endDate, hours, type, status,
             denyReason? }
MedicalPlan{ id, name, perPaycheckCost, tier }
```

Mock tax formulas (documented in-code and intentionally simple): fedWH = 12% of gross after a per-period allowance from filing status; state flat 4%; SS 6.2%; Medicare 1.45%. Deterministic to the cent so preview tables are identical across runs.

Seed: 45 employees (38 W-2, 7 contractors) across 5 departments, 6 historical pay runs, 5 pending PTO requests (one engineered overlap), 3 medical plans.

## 7. Session State

Single store: entity collections above, per-wizard state machines (current step, per-step data, dirty flags), UI state (open dialogs, table selections, unsaved-changes guards). Wizard commits are transactional — nothing touches the entity collections until the final confirmation. `?reset=1` restores the seed; `?wizard=payroll&step=3` style deep links let the harness jump into wizard mid-states for retakes.

## 8. Canonical Tutorial Scenarios

1. **Run your first payroll** — dashboard alert → wizard steps 1–4, including editing one employee's OT hours and adding a bonus so the preview visibly changes. (~20 steps; the flagship recording.)
2. **Onboard a new W-2 employee** — full 7-step wizard including a split direct deposit and a medical plan choice. Tests conditional branching and dependent validation.
3. **Onboard a contractor** — same wizard, opposite branch; a paired recording that demonstrates the conditional flow.
4. **Approve and deny time off** — approve one request, deny the overlapping one with a reason; show the balance change on the profile.
5. **Build and export a payroll summary report** — parameterize, generate, download CSV.

## 9. Agent-Friendliness Requirements

Baseline from the other tiers (`data-testid`, ARIA, ≤250 ms animations, `?reduceMotion=1`, `?reset=1`) plus: every domain-jargon field carries a tooltip with a one-sentence plain-English definition (the narration source of truth); destructive/irreversible-feeling actions use typed-confirmation dialogs with stable copy; table rows expose `data-employee-id` so row targeting never depends on visual position; wizard steppers are real navigation landmarks (`<nav aria-label="steps">`), letting the agent state where it is in the flow.

## 10. Definition of Done

All five scenarios completable end-to-end; step-1/2 edits provably reflected in step-3 math; both onboarding branches reach Review with correct step sets; typed confirmations enforced; CSV export matches the on-screen table; deterministic to the cent across reloads; zero console errors.
