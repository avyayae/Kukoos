import { type CSSProperties, useEffect, useRef } from 'react'
import type { SkillId, SkillMastery } from '@/domain'
import {
  SPANISH_AREAS,
  type SpanishNode,
  type SpanishNodeState,
  spanishNodes,
  spanishSkillsIn,
} from '@/domain/spanish/curriculum'
import { KukoosArt } from '@/ui/KukoosArt'
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion'

const LANES = [0, 1, 0, -1] as const
const STATE_TEXT: Record<SpanishNodeState, string> = {
  locked: 'locked',
  available: 'open',
  current: 'start here',
  crowned: 'crowned',
}

/**
 * The Spanish skills, Harbor → Market → Jungle Trail (spec 019, temporary until the F20
 * island map), with the same node look as the math and chess maps.
 */
export function SpanishPath({
  progress,
  onOpen,
}: {
  progress: Partial<Record<SkillId, SkillMastery>>
  onOpen: (node: SpanishNode) => void
}) {
  const nodes = spanishNodes(progress)
  const reduced = usePrefersReducedMotion()
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    document
      .querySelector<HTMLElement>('.spanish-path [data-current]')
      ?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  let lane = 0
  return (
    <div className="journey spanish-path" data-testid="spanish-path">
      {SPANISH_AREAS.map((area) => (
        <section key={area.id} className={`band band--es-${area.id}`} aria-label={area.title}>
          <h2 className="band__title">
            <span aria-hidden="true">{area.emoji}</span> {area.title}
          </h2>
          <div className="band__path">
            {spanishSkillsIn(area.id).map((skill) => {
              const node = nodes.find((n) => n.skill.id === skill.id) as SpanishNode
              const l = LANES[lane++ % LANES.length] as number
              return <Stop key={skill.id} node={node} lane={l} onOpen={onOpen} />
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function Stop({
  node,
  lane,
  onOpen,
}: {
  node: SpanishNode
  lane: number
  onOpen: (node: SpanishNode) => void
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
