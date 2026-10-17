import { useEffect } from 'react'

interface KeypadProps {
  onDigit: (digit: number) => void
  onBackspace: () => void
  disabled?: boolean
  /** Listen to the physical keyboard (0–9, Backspace). Only one keypad should listen at a time. */
  listenToKeyboard?: boolean
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** Big on-screen number pad. The OS keyboard never opens in lessons (skill rule 9). */
export function Keypad({
  onDigit,
  onBackspace,
  disabled = false,
  listenToKeyboard = true,
}: KeypadProps) {
  useEffect(() => {
    if (!listenToKeyboard || disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        onDigit(Number(e.key))
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onBackspace()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listenToKeyboard, disabled, onDigit, onBackspace])

  const key = (label: string, onPress: () => void, extra = '', aria?: string) => (
    <button
      key={label}
      type="button"
      className={`btn3d btn3d--ghost btn3d--xl keypad__key ${extra}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={aria ?? label}
    >
      {label}
    </button>
  )

  return (
    <div className="keypad" role="group" aria-label="Number pad">
      {DIGITS.map((d) => key(String(d), () => onDigit(d)))}
      {key('⌫', onBackspace, '', 'Delete')}
      {key('0', () => onDigit(0), 'keypad__key--wide')}
    </div>
  )
}
