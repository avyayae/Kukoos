import { legalMoves, pieceAt, pieces, play, status, withTurn } from './position'
import type { ChessMove, Color, PieceType, Position, Square } from './types'

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

export function isMateInOne(p: Position): boolean {
  return mateInOneMoves(p).length > 0
}
