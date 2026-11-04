import { type CSSProperties, useEffect, useRef } from 'react'
import type { SkillId, SkillMastery } from '@/domain'
import {
  SPANISH_AREAS,
  type SpanishArea,
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

interface HolaIslandProps {
  progress: Partial<Record<SkillId, SkillMastery>>
  onOpen: (node: SpanishNode) => void
  /** An area sign was tapped: say its name in Spanish and English (spec 020 AC2). */
  onSign: (area: SpanishArea) => void
  /** ¡Fiesta! (spec 020 AC4): open once the Jungle Trail is crowned. */
  fiesta: { open: boolean; done: boolean; onOpen: () => void }
}

/**
 * Hola Island (spec 020 AC1): Harbor → Market → Jungle Trail, bottom to top, with the same
 * node look as the math and chess maps, and ¡Fiesta! at the very top.
 */
export function HolaIsland({ progress, onOpen, onSign, fiesta }: HolaIslandProps) {
  const nodes = spanishNodes(progress)
  const reduced = usePrefersReducedMotion()
  const scrolled = useRef(false)
  useEffect(() => {
    if (scrolled.current) return
    scrolled.current = true
    document
      .querySelector<HTMLElement>('.hola-island [data-current]')
      ?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  let lane = 0
  return (
    <div className="journey hola-island" data-testid="hola-island">
      {SPANISH_AREAS.map((area) => (
        <section key={area.id} className={`band band--es-${area.id}`} aria-label={area.title}>
          <Scenery area={area.id} />
          <h2 className="band__title">
            <button
              type="button"
              className="island-sign"
              aria-label={`${area.title}, ${area.esName}`}
              data-testid={`sign-${area.id}`}
              onClick={() => onSign(area)}
            >
              <span aria-hidden="true">{area.emoji}</span> {area.title}
              <span className="island-sign__es" lang="es">
                {area.esName}
              </span>
            </button>
          </h2>
          <div className="band__path">
            {spanishSkillsIn(area.id).map((skill) => {
              const node = nodes.find((n) => n.skill.id === skill.id) as SpanishNode
              const l = LANES[lane++ % LANES.length] as number
              return <Stop key={skill.id} node={node} lane={l} onOpen={onOpen} />
            })}
            {area.id === 'jungle' && (
              <div className="map-row" style={{ '--lane': 0 } as CSSProperties}>
                <button
                  type="button"
                  className={`map-node map-node--${fiesta.done ? 'crowned' : fiesta.open ? 'available' : 'locked'} map-node--boss`}
                  aria-label={`¡Fiesta!, ${fiesta.done ? 'crowned' : fiesta.open ? 'open' : 'locked'}`}
                  data-testid="node-es-fiesta"
                  onClick={fiesta.onOpen}
                >
                  <span className="map-node__face" aria-hidden="true">
                    {fiesta.open || fiesta.done ? '🪅' : '🔒'}
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

/** Decorative scenery, drawn with tokens and CSS shapes (spec 020 UX notes). */
function Scenery({ area }: { area: SpanishArea['id'] }) {
  return (
    <div className={`island-scene island-scene--${area}`} aria-hidden="true">
      {area === 'harbor' && (
        <>
          <span className="island-scene__wave" />
          <span className="island-scene__wave island-scene__wave--2" />
          <span className="island-scene__boat">⛵</span>
        </>
      )}
      {area === 'market' && (
        <>
          <span className="island-scene__awning" />
          <span className="island-scene__awning island-scene__awning--2" />
        </>
      )}
      {area === 'jungle' && (
        <>
          <span className="island-scene__leaf" />
          <span className="island-scene__leaf island-scene__leaf--2" />
          <span className="island-scene__leaf island-scene__leaf--3" />
        </>
      )}
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
