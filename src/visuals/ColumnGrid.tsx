import type { Op } from '@/domain'
import { toDigits } from '@/domain/arithmetic/digits'
import { OP_SYMBOL } from '@/domain/speech'
import type { ColumnScratch } from './columnScratch'

const PLACE = ['ones', 'tens', 'hundreds'] as const

export type CellState = 'default' | 'correct' | 'incorrect'

interface ColumnGridProps {
  /** Top digits come from `scratch` (original + traded values). */
  b: number
  op: Op
  columns: number
  scratch: ColumnScratch
  /** Answer digits, ones first (null = empty). */
  answer: readonly (number | null)[]
  focus: number
  /** Guided mode: the one column to work on (others dimmed). */
  activeColumn: number | null
  cellState: (place: number) => CellState
  locked: boolean
  onTapTop: (place: number) => void
  onToggleCarry: (place: number) => void
  onFocusCell: (place: number) => void
}

/**
 * Vertical column method: marks row (borrow values / carry boxes), top, bottom with the
 * operator, a rule, and answer cells. Columns render left (hundreds) → right (ones).
 */
export function ColumnGrid({
  b,
  op,
  columns,
  scratch,
  answer,
  focus,
  activeColumn,
  cellState,
  locked,
  onTapTop,
  onToggleCarry,
  onFocusCell,
}: ColumnGridProps) {
  const places = Array.from({ length: columns }, (_, i) => columns - 1 - i)
  const bDigits = toDigits(b)
  const colClass = (p: number) =>
    activeColumn === null ? '' : p === activeColumn ? ' cg--active' : ' cg--dim'

  return (
    <div
      className="cg num"
      style={{ gridTemplateColumns: `repeat(${columns + 1}, var(--mq-cell))` }}
      data-testid="column-grid"
    >
      {/* marks row */}
      <span className="cg__op" />
      {places.map((p) => {
        if (op === '+') {
          if (p === 0) return <span key={p} className={`cg__mark${colClass(p)}`} />
          const on = scratch.carries[p] ?? false
          return (
            <button
              key={p}
              type="button"
              className={`cg__carry${on ? ' cg__carry--on' : ''}${colClass(p)}`}
              aria-label={`Carry into the ${PLACE[p]}${on ? ', 1' : ', empty'}`}
              aria-pressed={on}
              disabled={locked}
              onClick={() => onToggleCarry(p)}
            >
              {on ? '1' : ''}
            </button>
          )
        }
        const changed = scratch.top[p] !== scratch.original[p]
        return (
          <span key={p} className={`cg__mark${colClass(p)}`} data-testid={`mark-${p}`}>
            {changed ? scratch.top[p] : ''}
          </span>
        )
      })}

      {/* top row */}
      <span className="cg__op" />
      {places.map((p) => {
        const digit = scratch.original[p] as number
        const changed = scratch.top[p] !== scratch.original[p]
        const label = `${PLACE[p]} ${digit}${changed ? `, now ${scratch.top[p]}` : ''}`
        return op === '-' ? (
          <button
            key={p}
            type="button"
            className={`cg__top${changed ? ' cg__top--traded' : ''}${colClass(p)}`}
            aria-label={`Trade from the ${label}`}
            disabled={locked}
            onClick={() => onTapTop(p)}
            data-testid={`top-${p}`}
          >
            {digit}
          </button>
        ) : (
          <span key={p} className={`cg__digit${colClass(p)}`} data-testid={`top-${p}`}>
            {digit}
          </span>
        )
      })}

      {/* bottom row */}
      <span className="cg__op">{OP_SYMBOL[op]}</span>
      {places.map((p) => (
        <span key={p} className={`cg__digit${colClass(p)}`}>
          {p < bDigits.length ? bDigits[p] : ''}
        </span>
      ))}

      <span className="cg__rule" style={{ gridColumn: `1 / span ${columns + 1}` }} />

      {/* answer row */}
      <span className="cg__op" />
      {places.map((p) => {
        const value = answer[p] ?? null
        const state = cellState(p)
        return (
          <button
            key={p}
            type="button"
            className={`cg__cell cg__cell--${state}${focus === p && !locked ? ' cg__cell--focus' : ''}${colClass(p)}`}
            aria-label={`${PLACE[p]} answer, ${value ?? 'empty'}`}
            disabled={locked}
            onClick={() => onFocusCell(p)}
            data-testid={`cell-${p}`}
          >
            {value ?? ''}
          </button>
        )
      })}
    </div>
  )
}
