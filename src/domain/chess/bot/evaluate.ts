import type { PieceType } from '../types'
import type { FastBoard } from './fastBoard'

/** Centipawns. */
export const VALUE: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

// Piece-square tables from White's side, a8 first (the "simplified evaluation" idea):
// knights and pawns to the centre, the king tucked away until the endgame.
// prettier-ignore
const PST: Record<PieceType | 'kEnd', readonly number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
  kEnd: [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
  ],
}

/** Non-pawn material (both sides) at or below this is the endgame. */
const ENDGAME_MATERIAL = 1300

const centreDistance = (row: number, col: number) =>
  Math.max(3 - row, row - 4) + Math.max(3 - col, col - 4)

/**
 * The position from the side to move, in centipawns. A side left with only its king is
 * pushed to the edge and the other king walks up ("mop-up"), so the bot can finish a mate.
 */
export function evaluate(board: FastBoard): number {
  const squares = board.squares
  let score = 0
  let heavy = 0
  const kings = { w: 0, b: 0 }
  const material = { w: 0, b: 0 }
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) {
      sq += 7
      continue
    }
    const piece = squares[sq]
    if (!piece) continue
    const row = sq >> 4
    const col = sq & 7
    if (piece.type === 'k') {
      kings[piece.color] = sq
      continue
    }
    const index = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col
    const value = VALUE[piece.type] + (PST[piece.type][index] as number)
    material[piece.color] += VALUE[piece.type]
    if (piece.type !== 'p') heavy += VALUE[piece.type]
    score += piece.color === 'w' ? value : -value
  }
  const endgame = heavy <= ENDGAME_MATERIAL
  for (const color of ['w', 'b'] as const) {
    const sq = kings[color]
    const row = sq >> 4
    const col = sq & 7
    const index = color === 'w' ? row * 8 + col : (7 - row) * 8 + col
    const value = (endgame ? PST.kEnd : PST.k)[index] as number
    score += color === 'w' ? value : -value
  }
  // Mop-up: only when one side has a bare king and the other can mate.
  for (const [strong, weak] of [
    ['w', 'b'],
    ['b', 'w'],
  ] as const) {
    if (material[weak] !== 0 || material[strong] < VALUE.r) continue
    const w = kings[weak]
    const s = kings[strong]
    const between = Math.abs((w >> 4) - (s >> 4)) + Math.abs((w & 7) - (s & 7))
    const bonus = 10 * centreDistance(w >> 4, w & 7) + 4 * (14 - between)
    score += strong === 'w' ? bonus : -bonus
  }
  return board.turn === 'w' ? score : -score
}
