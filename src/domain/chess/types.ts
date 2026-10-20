/** Chess vocabulary (spec 014). Same spellings as chess.js, owned by us. */
export type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
export type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type Square = `${File}${Rank}`
export type Color = 'w' | 'b'
/** King, queen, rook, bishop, knight, pawn. */
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p'
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'

export interface Piece {
  type: PieceType
  color: Color
}

export interface PlacedPiece extends Piece {
  square: Square
}

/** A position is a value: playing a move returns a new one. */
export interface Position {
  readonly fen: string
  /** A practice board: kings are optional, and check, mate and draws don't apply. */
  readonly free: boolean
  /** Repetition keys of every position so far, this one last (for threefold). */
  readonly seen: readonly string[]
}

export interface MoveInput {
  from: Square
  to: Square
  promotion?: PromotionPiece
}

export interface ChessMove {
  from: Square
  to: Square
  /** Standard notation, e.g. "Nf3", "O-O", "exd6", "e8=Q#". */
  san: string
  piece: PieceType
  color: Color
  captured?: PieceType
  promotion?: PromotionPiece
  capture: boolean
  castle: boolean
  enPassant: boolean
  /** The move gives check (or mate). */
  check: boolean
}

export type DrawReason = 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient'

export interface ChessStatus {
  check: boolean
  checkmate: boolean
  stalemate: boolean
  draw: DrawReason | null
  over: boolean
  winner: Color | null
}

/** Why a move isn't allowed (spec 014 AC5): the chess misconception catalog. */
export type IllegalReason =
  | 'empty'
  | 'not-your-turn'
  | 'own-piece'
  | 'not-how-it-moves'
  | 'blocked'
  | 'king-in-check'
  | 'pinned'
  | 'into-check'
  | 'castle-not-allowed'
