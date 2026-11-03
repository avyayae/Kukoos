import { Chess, type Move } from 'chess.js'
import type {
  ChessMove,
  ChessStatus,
  Color,
  DrawReason,
  MoveInput,
  Piece,
  PlacedPiece,
  Position,
  Square,
} from './types'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Placement, side to move, castling and en passant: equal keys = the same position. */
export const repetitionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

const engines = new WeakMap<Position, Chess>()

/**
 * The chess.js instance for a position, built once and cached. Treat it as read-only:
 * `play` makes its move on it and undoes it straight away (positions stay plain values).
 */
export function engine(p: Position): Chess {
  let c = engines.get(p)
  if (!c) {
    c = new Chess(p.fen, p.free ? { skipValidation: true } : undefined)
    engines.set(p, c)
  }
  return c
}

export function startPosition(): Position {
  return { fen: START_FEN, free: false, seen: [repetitionKey(START_FEN)] }
}

/**
 * A position from FEN. `free` boards are for practice: kings are optional (spec 014 AC4).
 * Throws on an invalid FEN, so content mistakes fail loudly in tests.
 */
export function fromFen(fen: string, { free = false } = {}): Position {
  const loaded = new Chess(fen, free ? { skipValidation: true } : undefined).fen()
  return { fen: loaded, free, seen: [repetitionKey(loaded)] }
}

export const toFen = (p: Position) => p.fen

export function turn(p: Position): Color {
  return p.fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

/** The same position with the other side (or `color`) to move: for practice boards. */
export function withTurn(p: Position, color: Color): Position {
  if (turn(p) === color) return p
  const c = new Chess(p.fen, p.free ? { skipValidation: true } : undefined)
  c.setTurn(color)
  const fen = c.fen()
  return { fen, free: p.free, seen: [...p.seen.slice(0, -1), repetitionKey(fen)] }
}

export function pieceAt(p: Position, square: Square): Piece | null {
  const piece = engine(p).get(square)
  return piece ? { type: piece.type, color: piece.color } : null
}

/** Every piece with its square, from a8 to h1. */
export function pieces(p: Position): PlacedPiece[] {
  return engine(p)
    .board()
    .flat()
    .flatMap((cell) =>
      cell ? [{ type: cell.type, color: cell.color, square: cell.square as Square }] : [],
    )
}

function toChessMove(m: Move): ChessMove {
  return {
    from: m.from as Square,
    to: m.to as Square,
    san: m.san,
    piece: m.piece,
    color: m.color,
    ...(m.captured ? { captured: m.captured } : {}),
    ...(m.promotion && m.promotion !== 'k' && m.promotion !== 'p'
      ? { promotion: m.promotion }
      : {}),
    // chess.js doesn't count en passant as a capture; we do.
    capture: m.isCapture() || m.isEnPassant(),
    castle: m.isKingsideCastle() || m.isQueensideCastle(),
    enPassant: m.isEnPassant(),
    check: /[+#]$/.test(m.san),
  }
}

/** Legal moves for the side to move (from one square, or all). */
export function legalMoves(p: Position, from?: Square): ChessMove[] {
  const c = engine(p)
  const moves = from ? c.moves({ verbose: true, square: from }) : c.moves({ verbose: true })
  return moves.map(toChessMove)
}

export function canMove(p: Position, from: Square, to: Square): boolean {
  return legalMoves(p, from).some((m) => m.to === to)
}

/** Plays a move; `null` when it isn't legal. Never changes `p` (spec 014 AC7). */
export function play(
  p: Position,
  input: MoveInput,
): { position: Position; move: ChessMove } | null {
  const c = engine(p)
  let move: Move
  try {
    move = c.move(
      input.promotion
        ? { from: input.from, to: input.to, promotion: input.promotion }
        : { from: input.from, to: input.to },
    )
  } catch {
    return null
  }
  const fen = c.fen()
  const result = toChessMove(move)
  c.undo()
  return { position: { fen, free: p.free, seen: [...p.seen, repetitionKey(fen)] }, move: result }
}

/** Check, mate and draws (spec 014 AC3). Practice boards never end (AC4). */
export function status(p: Position): ChessStatus {
  if (p.free) {
    return {
      check: false,
      checkmate: false,
      stalemate: false,
      draw: null,
      over: false,
      winner: null,
    }
  }
  const c = engine(p)
  const checkmate = c.isCheckmate()
  const stalemate = c.isStalemate()
  const key = repetitionKey(p.fen)
  const repeats = p.seen.filter((k) => k === key).length
  let draw: DrawReason | null = null
  if (!checkmate) {
    if (stalemate) draw = 'stalemate'
    else if (c.isInsufficientMaterial()) draw = 'insufficient'
    else if (c.isDrawByFiftyMoves()) draw = 'fifty-move'
    else if (repeats >= 3) draw = 'threefold'
  }
  const toMove = turn(p)
  return {
    check: c.isCheck(),
    checkmate,
    stalemate,
    draw,
    over: checkmate || draw !== null,
    winner: checkmate ? (toMove === 'w' ? 'b' : 'w') : null,
  }
}
