/** Shared Tailwind class presets so controls look identical everywhere. */

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-500'

export const inputErrorCls = 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'

export const selectCls = inputCls + ' pr-8'

/** Same styles without w-full — for controls that set their own width. */
export const inputCompactCls = inputCls.replace('w-full ', '')
export const selectCompactCls = selectCls.replace('w-full ', '')

export const labelCls = 'mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700'

export const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${btnBase} bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600`

export const btnSecondary = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-slate-400`

export const btnDanger = `${btnBase} bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600`

export const btnGhost = `${btnBase} text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400`

export const cardCls = 'rounded-xl border border-slate-200 bg-white shadow-xs'

export const errorTextCls = 'mt-1 text-xs text-rose-600'

export const thCls = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'

export const tdCls = 'px-3 py-2.5 text-sm'
