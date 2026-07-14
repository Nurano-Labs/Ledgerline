# Ledgerline — Payroll & HR Mock App

A frontend-only Gusto/ADP-style payroll & HR platform built as the *complex* target for a
tutorial-recording agent. See [design-doc-3-payroll-hr.md](design-doc-3-payroll-hr.md) for the full spec.

No backend, no auth, no real tax math — all data is an in-memory deterministic seed
(reference date **2026-07-01**) that persists only for the session.

## Run

```bash
npm install
npm run dev        # http://localhost:5183
```

## Harness hooks

| Hook | Effect |
| --- | --- |
| `?reset=1` | Restore the seed data (any route) |
| `?reduceMotion=1` | Zero out all animation/transition durations |
| `?wizard=payroll&step=3` | Jump into the run-payroll wizard at step 3 (any route) |
| `?wizard=onboarding&step=5` | Jump into the onboarding wizard mid-flow with a canned draft |
| `window.__ledgerline.getState()` | Inspect the full store (entities + wizard state machines) |

Every interactive element carries a `data-testid`; table rows carry `data-employee-id`.
Domain-jargon fields have ⓘ tooltips (`data-testid="tooltip-<term>"`) whose copy is the
narration source of truth. Destructive actions use typed-confirmation dialogs
(terminate → employee name; approve payroll → `APPROVE`).

## Mock formulas (documented, deliberately simple)

- Federal withholding = 12% × max(0, gross − filing-status allowance − dependents credit ÷ 24) + extra withholding
- State 4% flat · Social Security 6.2% · Medicare 1.45%
- Salaried period gross = annual ÷ 24 · Hourly = rate × regular hours + 1.5 × rate × OT
- All math in integer cents — deterministic to the cent across reloads.

## Canonical tutorial scenarios

1. Run your first payroll (dashboard alert → 4-step wizard, edit OT hours + add a bonus, typed APPROVE)
2. Onboard a W-2 employee (7 steps, split direct deposit, medical plan)
3. Onboard a contractor (5-step branch of the same wizard)
4. Approve one PTO request and deny the overlapping one with a reason
5. Build and export a payroll summary report (CSV matches the on-screen table)
