const R = 18
const C = 2 * Math.PI * R

/** The daily goal ring (spec 008 AC11): fills with lesson minutes, shows ✓ when done. */
export function GoalRing({ progress, done }: { progress: number; done: boolean }) {
  const p = Math.max(0, Math.min(1, progress))
  return (
    <span className={`goal-ring${done ? ' goal-ring--done' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 44 44" className="goal-ring__svg">
        <circle className="goal-ring__track" cx="22" cy="22" r={R} />
        <circle
          className="goal-ring__fill"
          cx="22"
          cy="22"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="goal-ring__mark">{done ? '✓' : '🎯'}</span>
    </span>
  )
}
