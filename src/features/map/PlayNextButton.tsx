import type { MissionTarget } from '@/domain'
import { missionName } from './labels'

/** The one obvious next step (spec 007 AC5): always visible above the bottom bar. */
export function PlayNextButton({ target, onPlay }: { target: MissionTarget; onPlay: () => void }) {
  const name = missionName(target)
  return (
    <button
      type="button"
      className="btn3d btn3d--primary btn3d--xl btn3d--block play-next"
      aria-label={`Play next: ${name}`}
      data-testid="play-next"
      onClick={onPlay}
    >
      <span className="play-next__icon" aria-hidden="true">
        ▶
      </span>
      <span className="play-next__text">
        <span className="play-next__label">Play next</span>
        <span className="play-next__name">{name}</span>
      </span>
    </button>
  )
}
