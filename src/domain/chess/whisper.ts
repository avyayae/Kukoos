import { pieceAt, pieces } from './position'
import { attackersOf, PIECE_VALUES } from './teach'
import type { ChessMove, Color, Position, Square } from './types'

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w')

/**
 * The kid's pieces that can be taken for free (spec 017 whisper): attacked and not
 * defended, or attacked by a cheaper piece. Kings don't count.
 */
export function hangingPieces(p: Position, color: Color): Square[] {
  const them = other(color)
  return pieces(p)
    .filter((piece) => piece.color === color && piece.type !== 'k')
    .filter((piece) => {
      const attackers = attackersOf(p, piece.square, them)
      if (attackers.length === 0) return false
      if (attackersOf(p, piece.square, color).length === 0) return true
      const value = PIECE_VALUES[piece.type]
      return attackers.some((sq) => {
        const a = pieceAt(p, sq)
        return a !== null && a.type !== 'k' && PIECE_VALUES[a.type] < value
      })
    })
    .map((piece) => piece.square)
}

/**
 * The piece Kukoos whispers about after the kid's `move` (Sleepy Kukoos only): newly
 * free to take, most valuable first. A fair trade (the kid just took something at least
 * as valuable with that piece) is not a blunder, so it gets no whisper.
 */
export function whisperFor(before: Position, after: Position, move: ChessMove): Square | null {
  const color = move.color
  const already = new Set(hangingPieces(before, color))
  const fresh = hangingPieces(after, color).filter((sq) => !already.has(sq))
  const worthIt = (sq: Square) => {
    if (sq !== move.to || !move.captured) return false
    return PIECE_VALUES[move.captured] >= PIECE_VALUES[move.promotion ?? move.piece]
  }
  const candidates = fresh.filter((sq) => !worthIt(sq))
  let best: Square | null = null
  let bestValue = -1
  for (const sq of candidates) {
    const piece = pieceAt(after, sq)
    const value = piece ? PIECE_VALUES[piece.type] : 0
    if (value > bestValue) {
      best = sq
      bestValue = value
    }
  }
  return best
}
