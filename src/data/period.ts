/** Hardcoded reference date and semi-monthly pay-period calendar derived from it. */
export const REFERENCE_DATE = '2026-07-01'

export interface PayPeriod {
  start: string
  end: string
  payDate: string
}

/** The pay run currently due (drives the dashboard alert and /payroll/run). */
export const CURRENT_PERIOD: PayPeriod = { start: '2026-06-16', end: '2026-06-30', payDate: '2026-07-03' }

/** The period after the current one (shown once the current run is processed). */
export const NEXT_PERIOD: PayPeriod = { start: '2026-07-01', end: '2026-07-15', payDate: '2026-07-18' }

/** Six most recent completed periods, newest first — the seeded pay-run history. */
export const HISTORICAL_PERIODS: PayPeriod[] = [
  { start: '2026-06-01', end: '2026-06-15', payDate: '2026-06-18' },
  { start: '2026-05-16', end: '2026-05-31', payDate: '2026-06-03' },
  { start: '2026-05-01', end: '2026-05-15', payDate: '2026-05-18' },
  { start: '2026-04-16', end: '2026-04-30', payDate: '2026-05-03' },
  { start: '2026-04-01', end: '2026-04-15', payDate: '2026-04-18' },
  { start: '2026-03-16', end: '2026-03-31', payDate: '2026-04-03' },
]
