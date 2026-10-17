interface BottomBarProps {
  dueCount: number
  onMap: () => void
  onReview: () => void
  onGrownUps: () => void
}

/** Kid navigation (spec 007): big icon + label items, each one also speaks when tapped. */
export function BottomBar({ dueCount, onMap, onReview, onGrownUps }: BottomBarProps) {
  return (
    <nav className="bottom-bar" aria-label="Main">
      <button type="button" className="bottom-bar__item" aria-current="page" onClick={onMap}>
        <span className="bottom-bar__icon" aria-hidden="true">
          🗺️
        </span>
        <span>Map</span>
      </button>
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
