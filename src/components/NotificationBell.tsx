import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeeById, pendingPto, useStore } from '../store'
import { fmtRange } from '../data/format'
import { PTO_TYPE_LABELS } from './badges'
import { Icon } from './Icon'
import { CURRENT_PERIOD } from '../data/period'

/** Bell whose badge count = pending PTO approvals. */
export function NotificationBell() {
  const requests = useStore((s) => s.ptoRequests)
  const employees = useStore((s) => s.employees)
  const payrollDue = useStore((s) => s.payrollDue)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const pending = pendingPto(requests)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={`Notifications (${pending.length} pending approvals)`}
        data-testid="notification-bell"
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="bell" />
        {pending.length > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white"
          >
            {pending.length}
          </span>
        )}
      </button>
      {open && (
        <div
          data-testid="notification-panel"
          className="absolute right-0 top-full z-40 mt-1 w-80 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending approvals
          </p>
          {payrollDue && (
            <button
              type="button"
              className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                setOpen(false)
                navigate('/payroll/run')
              }}
            >
              <Icon name="payroll" className="mt-0.5 h-4 w-4 text-amber-600" />
              <span>
                <span className="font-medium text-slate-800">Pay run due</span>
                <span className="block text-xs text-slate-500">{fmtRange(CURRENT_PERIOD.start, CURRENT_PERIOD.end)}</span>
              </span>
            </button>
          )}
          {pending.length === 0 && !payrollDue && <p className="px-3 py-3 text-sm text-slate-500">You’re all caught up.</p>}
          {pending.map((r) => {
            const emp = employeeById(employees, r.employeeId)
            return (
              <button
                key={r.id}
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setOpen(false)
                  navigate('/time-off')
                }}
              >
                <Icon name="clock" className="mt-0.5 h-4 w-4 text-sky-600" />
                <span>
                  <span className="font-medium text-slate-800">{emp?.name}</span>
                  <span className="block text-xs text-slate-500">
                    {PTO_TYPE_LABELS[r.type]} · {fmtRange(r.startDate, r.endDate)} · {r.hours}h
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
