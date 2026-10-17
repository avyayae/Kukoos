import { WORLDS, type MapNode as Node } from '@/domain'
import { WORLD_EMOJI } from './labels'
import { MapNode } from './MapNode'
import { WorldArt } from './WorldArt'

/** Zigzag lanes along the path: 0, right, 0, left, … */
const LANES = [0, 1, 0, -1] as const

interface JourneyCanvasProps {
  nodes: readonly Node[]
  onSelect: (node: Node) => void
}

/**
 * The journey (spec 007): one continuous scene from the jungle (bottom) to Mars (top).
 * DOM order is the path order (jungle first) for keyboard and screen readers; CSS
 * column-reverse paints it bottom-up.
 */
export function JourneyCanvas({ nodes, onSelect }: JourneyCanvasProps) {
  // Global path index of each world's first node (keeps the zigzag continuous across worlds).
  const starts = WORLDS.map((w) => nodes.findIndex((n) => n.worldId === w.id))
  return (
    <div className="journey" data-testid="journey">
      {WORLDS.map((world, w) => {
        const worldNodes = nodes.filter((n) => n.worldId === world.id)
        const start = Math.max(0, starts[w] ?? 0)
        return (
          <section key={world.id} className={`band band--${world.id}`} aria-label={world.title}>
            <h2 className="band__title">
              <span aria-hidden="true">{WORLD_EMOJI[world.id]}</span> {world.title}
            </h2>
            <div className="band__path">
              {worldNodes.map((node, i) => (
                <MapNode
                  key={node.kind === 'boss' ? `boss-${node.worldId}` : node.skill.id}
                  node={node}
                  lane={LANES[(start + i) % LANES.length] as number}
                  onSelect={onSelect}
                />
              ))}
            </div>
            <WorldArt worldId={world.id} />
          </section>
        )
      })}
    </div>
  )
}
