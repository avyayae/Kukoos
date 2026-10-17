import { useEffect } from 'react'
import { Button3D } from './Button3D'
import { useAutoFocus } from './useAutoFocus'

interface ConfirmSheetProps {
  open: boolean
  title: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Bottom-sheet confirmation (e.g. "Leave this mission?"). The safe choice is primary; Escape cancels. */
export function ConfirmSheet({
  open,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const cancelRef = useAutoFocus<HTMLButtonElement>(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="sheet-backdrop">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="sheet__title">
          {title}
        </h2>
        <Button3D ref={cancelRef} variant="primary" size="xl" block onClick={onCancel}>
          {cancelLabel}
        </Button3D>
        <Button3D variant="ghost" size="lg" block onClick={onConfirm}>
          {confirmLabel}
        </Button3D>
      </div>
    </div>
  )
}
