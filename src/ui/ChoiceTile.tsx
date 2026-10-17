import type { ReactNode } from 'react'

export type ChoiceTileState = 'default' | 'selected' | 'correct' | 'incorrect'

interface ChoiceTileProps {
  state?: ChoiceTileState
  disabled?: boolean
  onSelect: () => void
  label: string
  children: ReactNode
}

const BADGE: Partial<Record<ChoiceTileState, string>> = { correct: '✓', incorrect: '↺' }

/** Big answer tile (mcq / true-false / compare). Icon + color, never color alone (skill rule 4). */
export function ChoiceTile({
  state = 'default',
  disabled,
  onSelect,
  label,
  children,
}: ChoiceTileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={state === 'selected' || state === 'correct'}
      aria-label={label}
      className={`tile${state === 'default' ? '' : ` tile--${state}`}`}
      disabled={disabled}
      onClick={onSelect}
    >
      {children}
      {BADGE[state] && (
        <span className="tile__badge" aria-hidden="true">
          {BADGE[state]}
        </span>
      )}
    </button>
  )
}
