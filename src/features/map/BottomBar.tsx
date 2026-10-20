interface BottomBarProps {
  /** The home item (the math map by default; the chess castle in chess, spec 013). */
  home?: { icon: string; label: string }
  dueCount?: number
  onMap: () => void
  /** Math review; courses without review leave it out. */
  onReview?: () => void
  onTrophies: () => void
  onGrownUps: () => void
}

/** Kid navigation (specs 007, 008): big icon + label items, each one also speaks when tapped. */
export function BottomBar({
  home = { icon: '🗺️', label: 'Map' },
  dueCount = 0,
  onMap,
  onReview,
  onTrophies,
  onGrownUps,
}: BottomBarProps) {
  return (
    <nav className="bottom-bar" aria-label="Main">
      <button type="button" className="bottom-bar__item" aria-current="page" onClick={onMap}>
        <span className="bottom-bar__icon" aria-hidden="true">
          {home.icon}
        </span>
        <span>{home.label}</span>
      </button>
      {onReview && (
        <button
          type="button"
          className={`bottom-bar__item${dueCount === 0 ? ' bottom-bar__item--quiet' : ''}`}
          aria-disabled={dueCount === 0}
          aria-label={dueCount === 0 ? 'Review, nothing due' : `Review, ${dueCount} due`}
          onClick={onReview}
        >
          <span className="bottom-bar__icon" aria-hidden="true">
            🔁
            {dueCount > 0 && <span className="bottom-bar__badge num">{dueCount}</span>}
          </span>
          <span>Review</span>
        </button>
      )}
      <button type="button" className="bottom-bar__item" onClick={onTrophies}>
        <span className="bottom-bar__icon" aria-hidden="true">
          🏆
        </span>
        <span>Trophies</span>
      </button>
      <button
        type="button"
        className="bottom-bar__item"
        aria-label="Grown-ups"
        onClick={onGrownUps}
      >
        <span className="bottom-bar__icon" aria-hidden="true">
          🔒
        </span>
        <span>Grown-ups</span>
      </button>
    </nav>
  )
}
