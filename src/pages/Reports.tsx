import { useMemo, useState } from 'react'
import type { Department } from '../types'
import { DEPARTMENTS } from '../types'
import { employeeById, useStore } from '../store'
import { centsToDecimal, downloadFile, fmtUSD, toCsv } from '../data/format'
import { hourlyEquivalentCents, totalOf } from '../data/payroll'
import { InfoTip } from '../components/InfoTip'
import { Icon } from '../components/Icon'
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls, tdCls, thCls } from '../components/ui'

type ReportType = 'payroll-summary' | 'pto-liability' | 'headcount'
type GroupBy = 'department' | 'employee' | 'type'

const REPORT_TYPES: { id: ReportType; name: string; blurb: string }[] = [
  { id: 'payroll-summary', name: 'Payroll summary', blurb: 'Gross-to-net totals for processed pay runs' },
  { id: 'pto-liability', name: 'PTO liability', blurb: 'Dollar value of unused paid time off' },
  { id: 'headcount', name: 'Headcount', blurb: 'People by department, status, and type' },
]

const GROUP_OPTIONS: Record<ReportType, { id: GroupBy; label: string }[]> = {
  'payroll-summary': [
    { id: 'department', label: 'Department' },
    { id: 'employee', label: 'Employee' },
  ],
  'pto-liability': [
    { id: 'department', label: 'Department' },
    { id: 'employee', label: 'Employee' },
  ],
  headcount: [
    { id: 'department', label: 'Department' },
    { id: 'type', label: 'Employment type' },
  ],
}

interface GeneratedReport {
  title: string
  header: string[]
  /** display rows (formatted) and csv rows (raw decimals) share the same shape */
  rows: string[][]
  csvRows: (string | number)[][]
  filename: string
}

export function Reports() {
  const employees = useStore((s) => s.employees)
  const payRuns = useStore((s) => s.payRuns)
  const toast = useStore((s) => s.toast)

  const [type, setType] = useState<ReportType>('payroll-summary')
  const [from, setFrom] = useState('2026-04-01')
  const [to, setTo] = useState('2026-07-31')
  const [depts, setDepts] = useState<Department[]>([...DEPARTMENTS])
  const [groupBy, setGroupBy] = useState<GroupBy>('department')
  const [report, setReport] = useState<GeneratedReport | null>(null)

  const groupOptions = GROUP_OPTIONS[type]

  function selectType(t: ReportType) {
    setType(t)
    setReport(null)
    if (!GROUP_OPTIONS[t].some((g) => g.id === groupBy)) setGroupBy(GROUP_OPTIONS[t][0].id)
  }

  function toggleDept(d: Department) {
    setDepts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const canGenerate = depts.length > 0 && from <= to

  const generate = useMemo(
    () => () => {
      const inDept = (empId: string) => {
        const emp = employeeById(employees, empId)
        return emp !== undefined && depts.includes(emp.department)
      }

      if (type === 'payroll-summary') {
        const runs = payRuns.filter((r) => r.payDate >= from && r.payDate <= to)
        const lines = runs.flatMap((r) => r.lines).filter((l) => inDept(l.employeeId))
        const groups = new Map<string, typeof lines>()
        lines.forEach((l) => {
          const emp = employeeById(employees, l.employeeId)
          const key = groupBy === 'employee' ? (emp?.name ?? l.employeeId) : (emp?.department ?? 'Unknown')
          groups.set(key, [...(groups.get(key) ?? []), l])
        })
        const keys = [...groups.keys()].sort()
        const header = [groupBy === 'employee' ? 'Employee' : 'Department', 'Gross', 'Federal WH', 'State WH', 'Social Security', 'Medicare', 'Benefits', 'Net']
        const money = (ls: typeof lines) =>
          (['gross', 'fedWH', 'stateWH', 'socialSecurity', 'medicare', 'benefitDeductions', 'net'] as const).map((k) => totalOf(ls, k))
        setReport({
          title: 'Payroll summary',
          header,
          rows: keys.map((k) => [k, ...money(groups.get(k)!).map(fmtUSD)]),
          csvRows: keys.map((k) => [k, ...money(groups.get(k)!).map(centsToDecimal)]),
          filename: `payroll-summary_${from}_${to}.csv`,
        })
      } else if (type === 'pto-liability') {
        const pool = employees.filter((e) => e.type === 'w2' && e.status !== 'Terminated' && depts.includes(e.department))
        const groups = new Map<string, typeof pool>()
        pool.forEach((e) => {
          const key = groupBy === 'employee' ? e.name : e.department
          groups.set(key, [...(groups.get(key) ?? []), e])
        })
        const keys = [...groups.keys()].sort()
        const liability = (es: typeof pool) => es.reduce((s, e) => s + e.ptoBalanceHrs * hourlyEquivalentCents(e), 0)
        const hours = (es: typeof pool) => es.reduce((s, e) => s + e.ptoBalanceHrs, 0)
        setReport({
          title: 'PTO liability',
          header: [groupBy === 'employee' ? 'Employee' : 'Department', 'Employees', 'PTO hours', 'Est. liability'],
          rows: keys.map((k) => {
            const es = groups.get(k)!
            return [k, String(es.length), `${hours(es)}h`, fmtUSD(liability(es))]
          }),
          csvRows: keys.map((k) => {
            const es = groups.get(k)!
            return [k, es.length, hours(es), centsToDecimal(liability(es))]
          }),
          filename: `pto-liability_${from}_${to}.csv`,
        })
      } else {
        const pool = employees.filter((e) => depts.includes(e.department))
        const keyOf = (e: (typeof pool)[number]) =>
          groupBy === 'type' ? (e.type === 'w2' ? 'W-2 employee' : '1099 contractor') : e.department
        const keys = [...new Set(pool.map(keyOf))].sort()
        const count = (k: string, pred: (e: (typeof pool)[number]) => boolean) => pool.filter((e) => keyOf(e) === k && pred(e)).length
        setReport({
          title: 'Headcount',
          header: [groupBy === 'type' ? 'Employment type' : 'Department', 'Active', 'Onboarding', 'Terminated', 'Total'],
          rows: keys.map((k) => [
            k,
            String(count(k, (e) => e.status === 'Active')),
            String(count(k, (e) => e.status === 'Onboarding')),
            String(count(k, (e) => e.status === 'Terminated')),
            String(count(k, () => true)),
          ]),
          csvRows: keys.map((k) => [
            k,
            count(k, (e) => e.status === 'Active'),
            count(k, (e) => e.status === 'Onboarding'),
            count(k, (e) => e.status === 'Terminated'),
            count(k, () => true),
          ]),
          filename: `headcount_${from}_${to}.csv`,
        })
      }
    },
    [type, from, to, depts, groupBy, employees, payRuns],
  )

  function exportCsv() {
    if (!report) return
    downloadFile(report.filename, toCsv(report.header, report.csvRows))
    toast(`Downloaded ${report.filename}`)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a report type, set parameters, generate, then export as CSV.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[15rem_18rem_1fr]">
        {/* Panel 1: report type */}
        <section aria-label="Report type" className="space-y-2">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              data-testid={`report-type-${rt.id}`}
              aria-pressed={type === rt.id}
              onClick={() => selectType(rt.id)}
              className={`${cardCls} w-full p-4 text-left transition-colors ${
                type === rt.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'hover:border-slate-300'
              }`}
            >
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                {rt.name}
                {rt.id === 'pto-liability' && <InfoTip term="ptoLiability" label="PTO liability" />}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{rt.blurb}</span>
            </button>
          ))}
        </section>

        {/* Panel 2: parameters */}
        <section aria-label="Report parameters" className={`${cardCls} h-fit p-5`}>
          <h2 className="font-semibold text-slate-900">Parameters</h2>
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={labelCls}>From</span>
                <input type="date" className={inputCls} value={from} data-testid="report-from" onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>To</span>
                <input type="date" className={inputCls} value={to} data-testid="report-to" onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            <fieldset>
              <legend className={labelCls}>Departments</legend>
              <div className="space-y-1">
                {DEPARTMENTS.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={depts.includes(d)}
                      data-testid={`report-dept-${d.toLowerCase()}`}
                      onChange={() => toggleDept(d)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={labelCls}>Group by</legend>
              <div className="space-y-1">
                {groupOptions.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="group-by"
                      className="accent-indigo-600"
                      checked={groupBy === g.id}
                      data-testid={`report-groupby-${g.id}`}
                      onChange={() => setGroupBy(g.id)}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className={`${btnPrimary} w-full`} disabled={!canGenerate} onClick={generate} data-testid="report-generate">
              Generate report
            </button>
            {depts.length === 0 && <p className="text-xs text-rose-600">Select at least one department.</p>}
          </div>
        </section>

        {/* Panel 3: output */}
        <section aria-label="Report output" className="min-w-0">
          {!report ? (
            <div className={`${cardCls} flex h-64 items-center justify-center text-sm text-slate-400`} data-testid="report-placeholder">
              Configure parameters and click “Generate report”.
            </div>
          ) : (
            <div className={`${cardCls} overflow-hidden`}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div>
                  <h2 className="font-semibold text-slate-900" data-testid="report-title">
                    {report.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {from} → {to} · {depts.length === DEPARTMENTS.length ? 'all departments' : depts.join(', ')}
                  </p>
                </div>
                <button className={btnSecondary} onClick={exportCsv} data-testid="report-download">
                  <Icon name="download" className="h-4 w-4" />
                  Download CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="report-table">
                  <thead className="bg-slate-50">
                    <tr>
                      {report.header.map((h, i) => (
                        <th key={h} className={`${thCls} ${i > 0 ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.length === 0 && (
                      <tr>
                        <td colSpan={report.header.length} className="px-4 py-8 text-center text-sm text-slate-500">
                          No data in the selected range.
                        </td>
                      </tr>
                    )}
                    {report.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className={`${tdCls} ${ci > 0 ? 'text-right tabular-nums' : 'font-medium text-slate-800'}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
