import { Chess } from 'chess.js'
import type { Color, MoveInput, PieceType, PromotionPiece, Square } from '../types'

/**
 * chess.js's internal move, in 0x88 squares (a8 = 0, h1 = 119). Pinned to chess.js 1.4.0:
 * `fastBoard.test.ts` fails loudly if an upgrade changes these internals.
 */
export interface RawMove {
  color: Color
  from: number
  to: number
  piece: PieceType
  captured?: PieceType
  promotion?: PromotionPiece
  flags: number
}

/** chess.js `BITS` (move flags). */
export const BITS = {
  capture: 2,
  epCapture: 8,
  promotion: 16,
  kCastle: 32,
  qCastle: 64,
} as const

interface Internals {
  _board: ({ type: PieceType; color: Color } | undefined)[]
  _turn: Color
  _hash: bigint
  _moves(options: { legal: boolean }): RawMove[]
  _makeMove(move: RawMove): void
  _undoMove(): unknown
  _isKingAttacked(color: Color): boolean
  fen(): string
}

const FILES = 'abcdefgh'

export const squareName = (sq: number): Square => `${FILES[sq & 7]}${8 - (sq >> 4)}` as Square

export const toInput = (m: RawMove): MoveInput =>
  m.promotion
    ? { from: squareName(m.from), to: squareName(m.to), promotion: m.promotion }
    : { from: squareName(m.from), to: squareName(m.to) }

/**
 * A search board for the bot (spec 017): chess.js's own pseudo-legal generator and
 * make/undo, 50–150× faster than the public `moves()` / `move()`, which build notation
 * for every move. Mutable on purpose; it never leaves `bot/`.
 */
export class FastBoard {
  private readonly c: Internals

  constructor(fen: string) {
    this.c = new Chess(fen) as unknown as Internals
  }

  get turn(): Color {
    return this.c._turn
  }

  /** Zobrist hash of the current position (for repetition in the search path). */
  get hash(): bigint {
    return this.c._hash
  }

  /** 128 entries in 0x88 order; off-board slots are empty. */
  get squares(): Internals['_board'] {
    return this.c._board
  }

  /** Pseudo-legal moves: `make` rejects the ones that leave the king in check. */
  pseudoMoves(): RawMove[] {
    return this.c._moves({ legal: false })
  }

  legalMoves(): RawMove[] {
    return this.c._moves({ legal: true })
  }

  /** Plays the move; returns false (and leaves the board as it was) if it's illegal. */
  make(m: RawMove): boolean {
    const us = this.c._turn
    this.c._makeMove(m)
    if (this.c._isKingAttacked(us)) {
      this.c._undoMove()
      return false
    }
    return true
  }

  undo(): void {
    this.c._undoMove()
  }

  inCheck(): boolean {
    return this.c._isKingAttacked(this.c._turn)
  }

  fen(): string {
    return this.c.fen()
  }
}
