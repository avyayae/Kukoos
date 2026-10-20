import { canMove, engine, pieceAt, status, turn } from './position'
import type { IllegalReason, PieceType, Position, Square } from './types'

/** Spoken piece names. */
export const PIECE_NAMES: Record<PieceType, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

const HOW_IT_MOVES: Record<PieceType, string> = {
  k: 'The king moves just one step.',
  q: 'The queen moves straight or diagonally.',
  r: 'The rook moves in straight lines.',
  b: 'The bishop moves diagonally.',
  n: 'The knight jumps in an L shape.',
  p: 'The pawn steps forward and captures diagonally.',
}

/** A gentle hint for each reason (spec 014 AC5), ≤ 8 words where possible. */
export function whyNot(reason: IllegalReason, piece: PieceType | null): string {
  const name = piece ? PIECE_NAMES[piece] : 'piece'
  switch (reason) {
    case 'empty':
      return 'Pick one of your pieces first.'
    case 'not-your-turn':
      return `That ${name} waits for its turn.`
    case 'own-piece':
      return `The ${name} can't land on its own team.`
    case 'not-how-it-moves':
      return HOW_IT_MOVES[piece ?? 'p']
    case 'blocked':
      return `Something is in the ${name}'s way.`
    case 'king-in-check':
      return `Your king is in check! Help the king first.`
    case 'pinned':
      return `That ${name} is guarding the king.`
    case 'into-check':
      return `The king can't step into danger.`
    case 'castle-not-allowed':
      return `The king can't castle right now.`
  }
}

const FILES = 'abcdefgh'
const xy = (sq: Square) => [FILES.indexOf(sq[0] ?? 'a'), Number(sq[1]) - 1] as const
const at = (x: number, y: number) => `${FILES[x]}${y + 1}` as Square

/** The right shape for this piece, ignoring other pieces (null = not a shape it makes). */
function shape(type: PieceType, white: boolean, from: Square, to: Square): 'ok' | 'castle' | null {
  const [fx, fy] = xy(from)
  const [tx, ty] = xy(to)
  const dx = tx - fx
  const dy = ty - fy
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax === 0 && ay === 0) return null
  switch (type) {
    case 'n':
      return (ax === 1 && ay === 2) || (ax === 2 && ay === 1) ? 'ok' : null
    case 'b':
      return ax === ay ? 'ok' : null
    case 'r':
      return ax === 0 || ay === 0 ? 'ok' : null
    case 'q':
      return ax === ay || ax === 0 || ay === 0 ? 'ok' : null
    case 'k':
      if (Math.max(ax, ay) === 1) return 'ok'
      return ay === 0 && ax === 2 && fx === 4 && fy === (white ? 0 : 7) ? 'castle' : null
    case 'p': {
      const dir = white ? 1 : -1
      if (dx === 0 && dy === dir) return 'ok'
      if (dx === 0 && dy === 2 * dir && fy === (white ? 1 : 6)) return 'ok'
      return ax === 1 && dy === dir ? 'ok' : null
    }
  }
}

/** The squares strictly between `from` and `to` on a line (empty for jumps and steps). */
function between(from: Square, to: Square): Square[] {
  const [fx, fy] = xy(from)
  const [tx, ty] = xy(to)
  const sx = Math.sign(tx - fx)
  const sy = Math.sign(ty - fy)
  const out: Square[] = []
  for (let x = fx + sx, y = fy + sy; x !== tx || y !== ty; x += sx, y += sy) out.push(at(x, y))
  return out
}

/**
 * Why `from → to` isn't legal, for hints and mistake patterns (spec 014 AC5); `null` if it
 * is legal. Checked in order: nothing there, whose turn, own piece, shape, path, king safety.
 */
export function explainIllegal(p: Position, from: Square, to: Square): IllegalReason | null {
  const piece = pieceAt(p, from)
  if (!piece) return 'empty'
  if (canMove(p, from, to)) return null
  if (piece.color !== turn(p)) return 'not-your-turn'
  const target = pieceAt(p, to)
  if (target && target.color === piece.color) return 'own-piece'

  const white = piece.color === 'w'
  const fit = shape(piece.type, white, from, to)
  if (fit === null) return 'not-how-it-moves'
  if (fit === 'castle') return 'castle-not-allowed'

  if (piece.type === 'p') {
    const straight = from[0] === to[0]
    if (straight && (target || between(from, to).some((sq) => pieceAt(p, sq)))) return 'blocked'
    // A diagonal step needs something to capture (en passant would have been legal).
    if (!straight && !target) return 'not-how-it-moves'
  } else if (piece.type !== 'n' && between(from, to).some((sq) => pieceAt(p, sq))) {
    return 'blocked'
  }

  // The shape and path are fine, so the move would leave the king attacked.
  if (piece.type === 'k') return 'into-check'
  if (!p.free && status(p).check) return 'king-in-check'
  if (p.free && kingAttacked(p, piece.color)) return 'king-in-check'
  return 'pinned'
}

function kingAttacked(p: Position, color: 'w' | 'b'): boolean {
  const c = engine(p)
  const king = c.findPiece({ type: 'k', color })[0]
  return king ? c.isAttacked(king, color === 'w' ? 'b' : 'w') : false
}
