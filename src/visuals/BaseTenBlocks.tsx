import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion'
import { available, type BlocksState, type Place, type Tool } from './blocksScratch'

const SHAPE: Record<Place, string> = { hundreds: 'flat', tens: 'rod', ones: 'cube' }
const ACTION: Record<Tool, string> = {
  break: 'Break a',
  takeAway: 'Take away a',
  bundle: 'Bundle ten',
}
const SINGULAR: Record<Place, string> = { hundreds: 'hundred', tens: 'ten', ones: 'one' }

interface BaseTenBlocksProps {
  state: BlocksState
  tool: Tool
  showHundreds: boolean
  locked: boolean
  onTap: (place: Place) => void
}

/**
 * Hundreds (flats), tens (rods) and ones (cubes). Each place is one big tap target
 * (≥ 56px) rather than tiny blocks, so a 7-year-old can hit it every time.
 */
export function BaseTenBlocks({ state, tool, showHundreds, locked, onTap }: BaseTenBlocksProps) {
  const reduced = usePrefersReducedMotion()
  const places: Place[] = showHundreds ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones']

  return (
    <div className="blocks" data-testid="blocks">
      {places.map((place) => {
        const left = available(state, place)
        const total = state[place]
        const fresh = !reduced && state.fresh?.place === place ? state.fresh.count : 0
        return (
          <button
            key={place}
            type="button"
            className={`blocks__place blocks__place--${place}`}
            disabled={locked}
            onClick={() => onTap(place)}
            aria-label={`${ACTION[tool]} ${tool === 'bundle' ? `${place}` : SINGULAR[place]}. ${left} ${place} left`}
            data-testid={`place-${place}`}
          >
            <span className="blocks__pile" key={`${place}:${state.fresh?.nonce ?? 0}`}>
              {Array.from({ length: total }, (_, i) => {
                const removed = i >= left
                const isNew = !removed && i >= left - fresh
                return (
                  <span
                    key={i}
                    className={`block block--${SHAPE[place]}${removed ? ' block--removed' : ''}${isNew ? ' block--new' : ''}`}
                    style={isNew ? { animationDelay: `${(i - (left - fresh)) * 30}ms` } : undefined}
                  />
                )
              })}
            </span>
            <span className="blocks__count num">
              {left} {place}
            </span>
          </button>
        )
      })}
    </div>
  )
}
