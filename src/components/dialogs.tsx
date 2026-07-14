import { useEffect, useRef, useState, type ReactNode } from 'react'
import { btnDanger, btnPrimary, btnSecondary, inputCls } from './ui'

function Overlay({ children, onClose, testid }: { children: ReactNode; onClose: () => void; testid: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose()
      }}
      ref={ref}
      data-testid={testid}
    >
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  )
}

/**
 * Typed-confirmation dialog for destructive / irreversible-feeling actions.
 * The confirm button stays disabled until the user types `requiredText` exactly.
 */
export function TypedConfirmDialog({
  open,
  title,
  body,
  requiredText,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  requiredText: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (open) setTyped('')
  }, [open])
  if (!open) return null
  const matches = typed === requiredText
  return (
    <Overlay onClose={onCancel} testid="typed-confirm-dialog">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-600">{body}</div>
      <label className="mt-4 block text-sm font-medium text-slate-700">
        Type <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-900">{requiredText}</code> to
        confirm
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={`${inputCls} mt-1.5 font-mono`}
          data-testid="typed-confirm-input"
          aria-label={`Type ${requiredText} to confirm`}
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} data-testid="typed-confirm-cancel">
          Cancel
        </button>
        <button
          className={danger ? btnDanger : btnPrimary}
          disabled={!matches}
          onClick={onConfirm}
          data-testid="typed-confirm-submit"
        >
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  )
}

/** Plain confirm dialog (used for unsaved changes and clearing wizard steps). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <Overlay onClose={onCancel} testid="confirm-dialog">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-600">{body}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button className={btnSecondary} onClick={onCancel} data-testid="confirm-dialog-cancel" autoFocus>
          {cancelLabel}
        </button>
        <button className={danger ? btnDanger : btnPrimary} onClick={onConfirm} data-testid="confirm-dialog-confirm">
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  )
}
