import { type CSSProperties, useEffect, useRef } from 'react'
import type { SkillId, SkillMastery } from '@/domain'
import {
  CHESS_AREAS,
  type CastleNode,
  castleNodes,
  type CastleNodeState,
  chessSkillsIn,
} from '@/domain/chess/curriculum'
import { KukoosArt } from '@/ui/KukoosArt'
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion'

const LANES = [0, 1, 0, -1] as const
const STATE_TEXT: Record<CastleNodeState, string> = {
  locked: 'locked',
  available: 'open',
  current: 'start here',
  crowned: 'crowned',
}

interface CastleMapProps {
  progress: Partial<Record<SkillId, SkillMastery>>
  onOpen: (node: CastleNode) => void
  /** "Your first game" (F17). */
  onGame: () => void
}

/**
 * Chess Castle (spec 016 AC7): Courtyard → Towers → Throne Room, bottom to top, the same
 * node look as the math map. The last stop, "Your first game", arrives with F17.
 */
export function CastleMap({ progress, onOpen, onGame }: CastleMapProps) {
  const nodes = castleNodes(progress)
  const reduced = usePrefersReducedMotion()
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    document
      .querySelector<HTMLElement>('.castle [data-current]')
      ?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  let lane = 0
  return (
    <div className="journey castle" data-testid="castle">
      {CHESS_AREAS.map((area) => (
        <section key={area.id} className={`band band--${area.id}`} aria-label={area.title}>
          <h2 className="band__title">
            <span aria-hidden="true">{area.emoji}</span> {area.title}
          </h2>
          <div className="band__path">
            {chessSkillsIn(area.id).map((skill) => {
              const node = nodes.find((n) => n.skill.id === skill.id) as CastleNode
              const l = LANES[lane++ % LANES.length] as number
              return <CastleStop key={skill.id} node={node} lane={l} onOpen={onOpen} />
            })}
            {area.id === 'throne' && (
              <div className="map-row" style={{ '--lane': 0 } as CSSProperties}>
                <button
                  type="button"
                  className="map-node map-node--locked map-node--boss"
                  aria-label="Your first game, coming soon"
                  data-testid="node-chess-game"
                  onClick={onGame}
                >
                  <span className="map-node__face" aria-hidden="true">
                    ♟️
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

function CastleStop({
  node,
  lane,
  onOpen,
}: {
  node: CastleNode
  lane: number
  onOpen: (node: CastleNode) => void
}) {
  const current = node.state === 'current'
  const style = { '--lane': lane, '--p': Math.round(node.mastery * 100) } as CSSProperties
  const face = node.state === 'locked' ? '🔒' : node.state === 'crowned' ? '👑' : String(node.order)
  return (
    <div className={`map-row${lane >= 0 ? ' map-row--here-left' : ''}`} style={style}>
      <button
        type="button"
        className={`map-node map-node--${node.state}`}
        aria-label={`Mission ${node.order}, ${node.skill.title}, ${STATE_TEXT[node.state]}`}
        data-current={current || undefined}
        data-testid={`node-${node.skill.id}`}
        onClick={() => onOpen(node)}
      >
        <span className="map-node__face num" aria-hidden="true">
          {face}
        </span>
      </button>
      {current && (
        <span className="map-node__here" aria-hidden="true">
          <span className="kukoos" data-mood="idle">
            <KukoosArt size={44} />
          </span>
          <span className="map-node__bubble">Start here!</span>
        </span>
      )}
    </div>
  )
}
