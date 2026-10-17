interface ProgressBarProps {
  /** 0–1 */
  value: number
  /** Combo ≥ 3 tints the bar flame-orange. */
  hot?: boolean
  label?: string
}

export function ProgressBar({ value, hot = false, label = 'Lesson progress' }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={`progress${hot ? ' progress--hot' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
