import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { playSfx } from '@/audio/sfx'
import {
  type ChessMove,
  type ChessStatus,
  type Color,
  explainIllegal,
  type IllegalReason,
  legalMoves,
  type MoveInput,
  pieceAt,
  pieces,
  play,
  type Position,
  type PromotionPiece,
  type Square,
  status,
  turn,
  whyNot,
} from '@/domain/chess'
import { useSpeakOnTap } from '@/ui'
import { COLOR_NAMES, isLight, pieceLabel, rowCol, squareAt, step } from './geometry'
import { PieceArt } from './PieceArt'
import { PromotionPicker } from './PromotionPicker'

export interface ChessBoardProps {
  position: Position
  onMove: (result: { move: ChessMove; position: Position }) => void
  /** Why a tried move isn't allowed (lesson hints, mistake patterns). */
  onIllegal?: (reason: IllegalReason) => void
  onGameOver?: (status: ChessStatus) => void
  /** Who may move: a colour, both (pass-and-play, free board) or none (read-only). */
  movable?: Color | 'both' | 'none'
  flipped?: boolean
  /** Highlighted and animated. */
  lastMove?: { from: Square; to: Square } | null
  label?: string
}

/** Pixels a press must travel before it's a drag rather than a tap. */
const DRAG_PX = 6
const HINT_MS = 3000

/**
 * The chess board (spec 015): tap or drag to move, dots for legal moves, a gentle "why not"
 * hint for anything else, keyboard play, and a live region that says every move.
 */
export function ChessBoard({
  position,
  onMove,
  onIllegal,
  onGameOver,
  movable = 'both',
  flipped = false,
  lastMove = null,
  label = 'Chess board',
}: ChessBoardProps) {
  const say = useSpeakOnTap()
  // Selection and the promotion picker belong to the position they were made on, so a new
  // position (our move, the bot's, a new game) clears them without an effect.
  const [sel, setSel] = useState<{ on: Position; square: Square } | null>(null)
  const selected = sel?.on === position ? sel.square : null
  const setSelected = (square: Square | null) => setSel(square ? { on: position, square } : null)
  const [focus, setFocus] = useState<Square>(flipped ? 'h8' : 'a1')
  const [hint, setHint] = useState<{ text: string; square: Square; n: number } | null>(null)
  const [promoState, setPromoState] = useState<{
    on: Position
    from: Square
    to: Square
  } | null>(null)
  const promo = promoState?.on === position ? promoState : null
  const setPromo = (p: { from: Square; to: Square } | null) =>
    setPromoState(p ? { on: position, ...p } : null)
  const [announce, setAnnounce] = useState('')
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number } | null>(null)
  const press = useRef<{ from: Square; x: number; y: number; dragging: boolean } | null>(null)
  const swallowClick = useRef(false)
  const buttons = useRef(new Map<Square, HTMLButtonElement>())

  const toMove = turn(position)
  const st = useMemo(() => status(position), [position])
  const board = useMemo(() => new Map(pieces(position).map((p) => [p.square, p])), [position])
  const targets = useMemo(
    () => (selected ? legalMoves(position, selected) : []),
    [position, selected],
  )
  const checkedKing = st.check
    ? [...board.values()].find((p) => p.type === 'k' && p.color === toMove)?.square
    : undefined

  useEffect(() => {
    if (!hint) return
    const id = window.setTimeout(() => setHint(null), HINT_MS)
    return () => window.clearTimeout(id)
  }, [hint])

  const canControl = (sq: Square) => {
    const piece = board.get(sq)
    if (!piece || movable === 'none' || st.over) return false
    return piece.color === toMove && (movable === 'both' || movable === piece.color)
  }

  function select(sq: Square) {
    const piece = board.get(sq)
    setSelected(sq)
    setHint(null)
    if (piece) say(pieceLabel(piece.color, piece.type))
  }

  function illegal(from: Square, to: Square) {
    const reason = explainIllegal(position, from, to) ?? 'not-how-it-moves'
    const text = whyNot(reason, pieceAt(position, from)?.type ?? null)
    setHint((h) => ({ text, square: from, n: (h?.n ?? 0) + 1 }))
    say(text)
    playSfx('notYet')
    onIllegal?.(reason)
  }

  function commit(input: MoveInput) {
    const result = play(position, input)
    if (!result) {
      illegal(input.from, input.to)
      return
    }
    const next = status(result.position)
    playSfx(next.check ? 'check' : result.move.capture ? 'capture' : 'move')
    setAnnounce(moveSpeech(result.move, next))
    setSelected(null)
    setHint(null)
    setPromo(null)
    onMove(result)
    if (next.over) onGameOver?.(next)
  }

  function attempt(from: Square, to: Square) {
    const promotions = legalMoves(position, from).filter((m) => m.to === to && m.promotion)
    if (promotions.length > 0) {
      setPromo({ from, to })
      say('Choose a new piece!')
      return
    }
    commit({ from, to })
  }

  function tap(sq: Square) {
    if (promo) return
    const piece = board.get(sq)
    if (selected) {
      if (sq === selected) {
        setSelected(null)
        return
      }
      if (targets.some((m) => m.to === sq)) {
        attempt(selected, sq)
        return
      }
      if (canControl(sq)) {
        select(sq)
        return
      }
      illegal(selected, sq)
      return
    }
    if (canControl(sq)) select(sq)
    else if (piece) say(pieceLabel(piece.color, piece.type))
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const delta = moves[e.key]
    if (!delta) return
    e.preventDefault()
    const next = step(focus, delta[0], delta[1], flipped)
    if (!next) return
    setFocus(next)
    buttons.current.get(next)?.focus()
  }

  // ---- drag: press on your piece, move past DRAG_PX, release over a square
  function onPointerDown(e: PointerEvent<HTMLButtonElement>, sq: Square) {
    if (!canControl(sq) || promo) return
    press.current = { from: sq, x: e.clientX, y: e.clientY, dragging: false }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current
    if (!p) return
    if (!p.dragging && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_PX) return
    if (!p.dragging) {
      p.dragging = true
      setSelected(p.from)
    }
    setDrag({ from: p.from, x: e.clientX, y: e.clientY })
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = press.current
    press.current = null
    if (!p?.dragging) return
    setDrag(null)
    swallowClick.current = true
    const el = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-square]')
    const to = el?.dataset.square as Square | undefined
    if (!to || to === p.from) return
    if (legalMoves(position, p.from).some((m) => m.to === to)) attempt(p.from, to)
    else illegal(p.from, to)
  }

  const rows = Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, col) => squareAt(row, col, flipped)),
  )
  const moveKey = position.seen.length
  const glide = (sq: Square): CSSProperties | undefined => {
    if (!lastMove || lastMove.to !== sq) return undefined
    const a = rowCol(lastMove.from, flipped)
    const b = rowCol(lastMove.to, flipped)
    return { '--from-x': a.col - b.col, '--from-y': a.row - b.row } as CSSProperties
  }

  return (
    <div className="chess">
      <div
        className={`chess-board${drag ? ' chess-board--dragging' : ''}`}
        role="grid"
        tabIndex={-1}
        aria-label={`${label}. ${COLOR_NAMES[toMove]} to move.`}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null
          setDrag(null)
        }}
      >
        {rows.map((squares, row) => (
          <div className="chess-board__row" role="row" key={row}>
            {squares.map((sq, col) => {
              const piece = board.get(sq)
              const move = targets.find((m) => m.to === sq)
              const isLast = lastMove?.from === sq || lastMove?.to === sq
              const classes = [
                'sq',
                isLight(sq) ? 'sq--light' : 'sq--dark',
                isLast && 'sq--last',
                selected === sq && 'sq--selected',
                move && (move.capture ? 'sq--capture' : 'sq--target'),
                checkedKing === sq && 'sq--check',
              ]
              const name = [
                sq,
                piece ? pieceLabel(piece.color, piece.type) : 'empty',
                selected === sq && 'selected',
                move && (move.capture ? 'can capture' : 'can move here'),
                checkedKing === sq && 'in check',
              ]
              return (
                <div role="gridcell" className="chess-board__cell" key={sq}>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) buttons.current.set(sq, el)
                      else buttons.current.delete(sq)
                    }}
                    className={classes.filter(Boolean).join(' ')}
                    data-square={sq}
                    data-testid={`sq-${sq}`}
                    tabIndex={sq === focus ? 0 : -1}
                    aria-label={name.filter(Boolean).join(', ')}
                    onFocus={() => setFocus(sq)}
                    onPointerDown={(e) => onPointerDown(e, sq)}
                    onClick={() => {
                      if (swallowClick.current) {
                        swallowClick.current = false
                        return
                      }
                      tap(sq)
                    }}
                  >
                    {piece && (
                      <span
                        key={
                          hint?.square === sq
                            ? `${sq}-shake-${hint.n}`
                            : lastMove?.to === sq
                              ? `${sq}-${moveKey}`
                              : sq
                        }
                        className={[
                          'sq__piece',
                          lastMove?.to === sq && 'sq__piece--glide',
                          hint?.square === sq && 'sq__piece--shake',
                          drag?.from === sq && 'sq__piece--lifted',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={glide(sq)}
                      >
                        <PieceArt type={piece.type} color={piece.color} />
                      </span>
                    )}
                    {checkedKing === sq && (
                      <span className="sq__check" aria-hidden="true">
                        ⚠
                      </span>
                    )}
                    {col === 0 && (
                      <span className="sq__rank" aria-hidden="true">
                        {sq[1]}
                      </span>
                    )}
                    {row === 7 && (
                      <span className="sq__file" aria-hidden="true">
                        {sq[0]}
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
        {promo && (
          <PromotionPicker
            color={toMove}
            onPick={(piece: PromotionPiece) =>
              commit({ from: promo.from, to: promo.to, promotion: piece })
            }
            onCancel={() => setPromo(null)}
          />
        )}
      </div>
      {drag &&
        (() => {
          const piece = board.get(drag.from)
          return piece ? (
            <span
              className="chess-drag"
              style={{ left: drag.x, top: drag.y } as CSSProperties}
              aria-hidden="true"
            >
              <PieceArt type={piece.type} color={piece.color} />
            </span>
          ) : null
        })()}
      <p className="chess-hint" role="status">
        {hint?.text ?? ''}
      </p>
      <p className="sr-only" aria-live="polite" data-testid="chess-announce">
        {announce}
      </p>
    </div>
  )
}

/** "White knight to f3. Check!" — for the live region. */
function moveSpeech(move: ChessMove, next: ChessStatus): string {
  const who = pieceLabel(move.color, move.piece)
  const what = move.castle
    ? `${COLOR_NAMES[move.color]} castles.`
    : move.capture
      ? `${who} takes on ${move.to}.`
      : `${who} to ${move.to}.`
  if (next.checkmate) return `${what} Checkmate! ${COLOR_NAMES[move.color]} wins.`
  if (next.draw) return `${what} It's a draw.`
  if (next.check) return `${what} Check!`
  return what
}
