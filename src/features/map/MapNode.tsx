import type { CSSProperties } from 'react'
import type { MapNode as Node } from '@/domain'
import { KukoosPlaceholder } from '@/ui'
import { BOSS_EMOJI, nodeLabel } from './labels'

interface MapNodeProps {
  node: Node
  /** Zigzag column: -1, 0 or 1. Kukoos + "Start here!" sit on the roomier side. */
  lane: number
  onSelect: (node: Node) => void
}

/** One stop on the journey (spec 007): locked / available / current / crowned, or a boss. */
export function MapNode({ node, lane, onSelect }: MapNodeProps) {
  const boss = node.kind === 'boss'
  const current = node.state === 'current'
  const mastery = node.kind === 'skill' ? node.mastery : 0
  const style = { '--lane': lane, '--p': Math.round(mastery * 100) } as CSSProperties

  let face: string
  if (node.state === 'locked') face = '🔒'
  else if (node.state === 'crowned') face = '👑'
  else if (boss) face = BOSS_EMOJI[node.worldId]
  else face = String(node.skill.order)

  return (
    <div className={`map-row${lane >= 0 ? ' map-row--here-left' : ''}`} style={style}>
      <button
        type="button"
        className={`map-node map-node--${node.state}${boss ? ' map-node--boss' : ''}`}
        aria-label={nodeLabel(node)}
        data-current={current || undefined}
        data-testid={boss ? `boss-${node.worldId}` : `node-${node.skill.id}`}
        onClick={() => onSelect(node)}
      >
        <span className="map-node__face num" aria-hidden="true">
          {face}
        </span>
      </button>
      {current && (
        <span className="map-node__here" aria-hidden="true">
          <KukoosPlaceholder size={44} />
          <span className="map-node__bubble">Start here!</span>
        </span>
      )}
    </div>
  )
}
