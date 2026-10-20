import { engine, legalMoves, pieceAt, pieces, play, status, withTurn } from './position'
import type { ChessMove, Color, Piece, PieceType, Position, Square } from './types'

/** Classic piece values (spec 014): the king isn't counted. */
export const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/** Points on the board for each side. */
export function material(p: Position): Record<Color, number> {
  const total: Record<Color, number> = { w: 0, b: 0 }
  for (const piece of pieces(p)) total[piece.color] += PIECE_VALUES[piece.type]
  return total
}

/** Where the piece on `from` can go in one move, whoever's turn it is ("where can it go?"). */
export function reachable(p: Position, from: Square): Square[] {
  const piece = pieceAt(p, from)
  if (!piece) return []
  const targets = legalMoves(withTurn(p, piece.color), from).map((m) => m.to)
  return [...new Set(targets)]
}

/** The moves that checkmate right now. */
export function mateInOneMoves(p: Position): ChessMove[] {
  return legalMoves(p).filter((m) => {
    const next = play(p, m)
    return next !== null && status(next.position).checkmate
  })
}

/** Stops at the first mate found (solvers call this a lot). */
export function isMateInOne(p: Position): boolean {
  return firstMateInOne(p) !== null
}

export function firstMateInOne(p: Position): ChessMove | null {
  for (const m of legalMoves(p)) {
    const next = play(p, m)
    if (next !== null && status(next.position).checkmate) return m
  }
  return null
}

/** Squares of `by`'s pieces that attack `square` (for "that square is watched by…"). */
export function attackersOf(p: Position, square: Square, by: Color): Square[] {
  return engine(p).attackers(square, by) as Square[]
}

/** A board from pieces, e.g. `{ d4: { type: 'r', color: 'w' } }`, with `turn` to move. */
export function boardFen(placed: Partial<Record<Square, Piece>>, turn: Color = 'w'): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (const file of 'abcdefgh') {
      const piece = placed[`${file}${rank}` as Square]
      if (!piece) {
        empty++
        continue
      }
      if (empty) row += String(empty)
      empty = 0
      row += piece.color === 'w' ? piece.type.toUpperCase() : piece.type
    }
    rows.push(empty ? row + String(empty) : row)
  }
  return `${rows.join('/')} ${turn} - - 0 1`
}
