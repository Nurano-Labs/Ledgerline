import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PTORequest } from '../types'
import { employeeById, pendingPto, useStore } from '../store'
import { fmtRange } from '../data/format'
import { Avatar, PTO_TYPE_LABELS, PtoTypeBadge } from '../components/badges'
import { Icon } from '../components/Icon'
import { btnDanger, btnPrimary, btnSecondary, cardCls, errorTextCls, inputCls, inputErrorCls } from '../components/ui'

/** Two pending requests overlap when they share a department and their date ranges intersect. */
function overlapsWith(request: PTORequest, all: PTORequest[], sameDept: (a: string, b: string) => boolean): PTORequest | undefined {
  return all.find(
    (other) =>
      other.id !== request.id &&
      other.status === 'pending' &&
      sameDept(other.employeeId, request.employeeId) &&
      other.startDate <= request.endDate &&
      request.startDate <= other.endDate,
  )
}

export function TimeOff() {
  const requests = useStore((s) => s.ptoRequests)
  const employees = useStore((s) => s.employees)
  const decidePto = useStore((s) => s.decidePto)
  const toast = useStore((s) => s.toast)
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState('')
  const [denyError, setDenyError] = useState('')

  const pending = pendingPto(requests)
  const decided = requests.filter((r) => r.status !== 'pending')

  const sameDept = (a: string, b: string) =>
    employeeById(employees, a)?.department === employeeById(employees, b)?.department

  function approve(request: PTORequest) {
    const emp = employeeById(employees, request.employeeId)
    decidePto(request.id, 'approved')
    toast(`Approved ${emp?.name}’s ${PTO_TYPE_LABELS[request.type].toLowerCase()} request (−${request.hours}h).`)
  }

  function submitDeny(request: PTORequest) {
    if (!denyReason.trim()) {
      setDenyError('A reason is required to deny a request.')
      return
    }
    const emp = employeeById(employees, request.employeeId)
    decidePto(request.id, 'denied', denyReason.trim())
    toast(`Denied ${emp?.name}’s request.`)
    setDenyingId(null)
    setDenyReason('')
    setDenyError('')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Time Off</h1>
      <p className="mt-1 text-sm text-slate-500">
        {pending.length} pending request{pending.length === 1 ? '' : 's'} awaiting your approval
      </p>

      <div className="mt-5 space-y-4">
        {pending.length === 0 && (
          <div className={`${cardCls} px-5 py-8 text-center text-sm text-slate-500`} data-testid="pto-empty">
            No pending requests — you’re all caught up.
          </div>
        )}
        {pending.map((request) => {
          const emp = employeeById(employees, request.employeeId)
          if (!emp) return null
          const overlap = overlapsWith(request, requests, sameDept)
          const overlapEmp = overlap ? employeeById(employees, overlap.employeeId) : undefined
          const denying = denyingId === request.id
          return (
            <div key={request.id} className={`${cardCls} p-5`} data-testid={`pto-card-${request.id}`} data-employee-id={emp.id}>
              <div className="flex items-start gap-4">
                <Avatar name={emp.name} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/people/${emp.id}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                      {emp.name}
                    </Link>
                    <span className="text-sm text-slate-500">· {emp.department}</span>
                    <PtoTypeBadge type={request.type} />
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {fmtRange(request.startDate, request.endDate)} · <span className="font-medium">{request.hours} hours</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500" data-testid={`pto-balance-${request.id}`}>
                    Remaining balance if approved: {Math.max(0, emp.ptoBalanceHrs - request.hours)}h (currently {emp.ptoBalanceHrs}h)
                  </p>
                  {overlap && overlapEmp && (
                    <p
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
                      data-testid={`pto-overlap-${request.id}`}
                    >
                      <Icon name="warning" className="h-3.5 w-3.5" />
                      Overlaps with {overlapEmp.name}’s {fmtRange(overlap.startDate, overlap.endDate)} request — both are in{' '}
                      {emp.department}.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className={btnPrimary} onClick={() => approve(request)} data-testid={`pto-approve-${request.id}`}>
                    Approve
                  </button>
                  <button
                    className={btnSecondary}
                    onClick={() => {
                      setDenyingId(denying ? null : request.id)
                      setDenyReason('')
                      setDenyError('')
                    }}
                    data-testid={`pto-deny-${request.id}`}
                  >
                    Deny
                  </button>
                </div>
              </div>
              {denying && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <label className="block text-sm font-medium text-slate-700">
                    Reason for denial (shared with {emp.name.split(' ')[0]})
                    <textarea
                      autoFocus
                      rows={2}
                      value={denyReason}
                      onChange={(e) => {
                        setDenyReason(e.target.value)
                        setDenyError('')
                      }}
                      className={`${inputCls} mt-1.5 ${denyError ? inputErrorCls : ''}`}
                      data-testid={`pto-deny-reason-${request.id}`}
                    />
                  </label>
                  {denyError && <p className={errorTextCls}>{denyError}</p>}
                  <div className="mt-3 flex justify-end gap-2">
                    <button className={btnSecondary} onClick={() => setDenyingId(null)}>
                      Cancel
                    </button>
                    <button className={btnDanger} onClick={() => submitDeny(request)} data-testid={`pto-deny-submit-${request.id}`}>
                      Deny request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {decided.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Decided this session</h2>
          <ul className="mt-3 space-y-2">
            {decided.map((r) => {
              const emp = employeeById(employees, r.employeeId)
              return (
                <li key={r.id} className={`${cardCls} flex items-center gap-3 px-4 py-2.5 text-sm`} data-testid={`pto-decided-${r.id}`}>
                  <Icon
                    name={r.status === 'approved' ? 'check' : 'x'}
                    className={`h-4 w-4 ${r.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}
                  />
                  <span className="font-medium text-slate-800">{emp?.name}</span>
                  <span className="text-slate-500">
                    {PTO_TYPE_LABELS[r.type]} · {fmtRange(r.startDate, r.endDate)} · {r.hours}h
                  </span>
                  <span className={`ml-auto font-medium ${r.status === 'approved' ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {r.status}
                  </span>
                  {r.denyReason && <span className="text-xs text-slate-500">“{r.denyReason}”</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
