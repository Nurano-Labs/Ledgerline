import type { EmployeeStatus, EmploymentType, PtoType } from '../types'
import { initials } from '../data/format'

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Onboarding: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Terminated: 'bg-rose-50 text-rose-700 ring-rose-600/20',
}

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
      data-testid="status-badge"
    >
      {status}
    </span>
  )
}

export function TypeBadge({ type }: { type: EmploymentType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        type === 'w2' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      {type === 'w2' ? 'W-2 employee' : '1099 contractor'}
    </span>
  )
}

export const PTO_TYPE_LABELS: Record<PtoType, string> = {
  vacation: 'Vacation',
  sick: 'Sick',
  personal: 'Personal',
}

export function PtoTypeBadge({ type }: { type: PtoType }) {
  const styles: Record<PtoType, string> = {
    vacation: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    sick: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    personal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[type]}`}>
      {PTO_TYPE_LABELS[type]}
    </span>
  )
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const hue = AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]
  const sizeCls = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-9 w-9 text-xs'
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${hue} ${sizeCls}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
