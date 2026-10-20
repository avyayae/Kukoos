// Chess rules (spec 014). Import from '@/domain/chess', never from the '@/domain' barrel,
// so chess.js loads only with the chess course (constitution §3.7).
export * from './types'
export {
  canMove,
  fromFen,
  legalMoves,
  pieceAt,
  pieces,
  play,
  repetitionKey,
  START_FEN,
  startPosition,
  status,
  toFen,
  turn,
  withTurn,
} from './position'
export { explainIllegal, PIECE_NAMES, whyNot } from './explain'
export {
  attackersOf,
  boardFen,
  isMateInOne,
  material,
  mateInOneMoves,
  PIECE_VALUES,
  reachable,
} from './teach'
