import { useEffect } from 'react'
import type { MapNode } from '@/domain'
import { Button3D, Kukoos } from '@/ui'
import { useAutoFocus } from '@/ui/useAutoFocus'
import { missionName, targetOf } from './labels'

interface MissionSheetProps {
  node: MapNode | null
  onPlay: (node: MapNode) => void
  onClose: () => void
}

const STATUS: Record<MapNode['state'], string> = {
  locked: '',
  crowned: 'You mastered this one! 👑 Play again any time.',
  current: 'This is your next mission.',
  available: 'Ready when you are!',
}

/** Tapped-node sheet (spec 007 AC7): name (spoken), status, and PLAY, or "Not yet!" when locked. */
export function MissionSheet({ node, onPlay, onClose }: MissionSheetProps) {
  const playRef = useAutoFocus<HTMLButtonElement>(node)

  useEffect(() => {
    if (!node) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [node, onClose])

  if (!node) return null
  const name = missionName(targetOf(node))
  const locked = node.state === 'locked'

  return (
    <div className="sheet-backdrop">
      <div
        className="sheet mission-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-title"
      >
        <Kukoos mood={locked ? 'think' : node.state === 'crowned' ? 'cheer' : 'happy'} size={72}>
          {locked
            ? `Not yet! Finish ${node.blockedBy ?? 'the mission before'} first.`
            : STATUS[node.state]}
        </Kukoos>
        <h2 id="mission-title" className="sheet__title">
          {name}
        </h2>
        {!locked && (
          <Button3D ref={playRef} variant="primary" size="xl" block onClick={() => onPlay(node)}>
            Play
          </Button3D>
        )}
        <Button3D variant="ghost" size="lg" block onClick={onClose}>
          Back to map
        </Button3D>
      </div>
    </div>
  )
}
