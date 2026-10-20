import type { Color, PieceType, Square } from '@/domain/chess'
import { PIECE_NAMES } from '@/domain/chess'

/** Board geometry in screen space (spec 015): row 0 is the top row as drawn. */
export const FILES = 'abcdefgh'

export function squareAt(row: number, col: number, flipped = false): Square {
  const file = flipped ? 7 - col : col
  const rank = flipped ? row + 1 : 8 - row
  return `${FILES[file]}${rank}` as Square
}

export function rowCol(square: Square, flipped = false): { row: number; col: number } {
  const file = FILES.indexOf(square[0] ?? 'a')
  const rank = Number(square[1])
  return flipped ? { row: rank - 1, col: 7 - file } : { row: 8 - rank, col: file }
}

/** a1 is dark. */
export function isLight(square: Square): boolean {
  const file = FILES.indexOf(square[0] ?? 'a')
  const rank = Number(square[1])
  return (file + rank) % 2 === 1
}

/** The square one step away on screen (arrow keys); `null` off the edge. */
export function step(square: Square, dRow: number, dCol: number, flipped = false): Square | null {
  const { row, col } = rowCol(square, flipped)
  const r = row + dRow
  const c = col + dCol
  return r < 0 || r > 7 || c < 0 || c > 7 ? null : squareAt(r, c, flipped)
}

export const COLOR_NAMES: Record<Color, string> = { w: 'White', b: 'Black' }

/** "White knight", spoken and used in accessible names. */
export function pieceLabel(color: Color, type: PieceType): string {
  return `${COLOR_NAMES[color]} ${PIECE_NAMES[type]}`
}
