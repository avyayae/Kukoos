import type { BotLevel } from './bot/levels'
import { fromFen, play, START_FEN, status, turn } from './position'
import type {
  ChessMove,
  ChessStatus,
  Color,
  DrawReason,
  MoveInput,
  Position,
  PromotionPiece,
  Square,
} from './types'

/** How a game ended, from the kid's side (spec 017). `ended` = stopped early: not a loss. */
export type GameResult = 'win' | 'loss' | `draw:${DrawReason}` | 'ended'

/** A game against Kukoos (spec 017): a value, like `Position`. */
export interface GameState {
  level: BotLevel
  kidColor: Color
  startFen: string
  /** Every move so far, as UCI ("e2e4", "e7e8q"). */
  moves: readonly string[]
  position: Position
  lastMove: { from: Square; to: Square } | null
  result: GameResult | null
}

export const toUci = (m: MoveInput): string => `${m.from}${m.to}${m.promotion ?? ''}`

export function fromUci(uci: string): MoveInput {
  const from = uci.slice(0, 2) as Square
  const to = uci.slice(2, 4) as Square
  const promotion = uci[4] as PromotionPiece | undefined
  return promotion ? { from, to, promotion } : { from, to }
}

/** The kid's result for a finished position; `null` while the game goes on. */
export function resultOf(s: ChessStatus, kidColor: Color): GameResult | null {
  if (s.checkmate) return s.winner === kidColor ? 'win' : 'loss'
  if (s.draw) return `draw:${s.draw}`
  return null
}

export function newGame(level: BotLevel, kidColor: Color, startFen = START_FEN): GameState {
  return {
    level,
    kidColor,
    startFen,
    moves: [],
    position: fromFen(startFen),
    lastMove: null,
    result: null,
  }
}

/**
 * Rebuilds a game from its start and moves (saved games, take back). Replaying keeps the
 * repetition history right for threefold. Throws on a move that isn't legal.
 */
export function replay(
  base: Pick<GameState, 'level' | 'kidColor' | 'startFen'>,
  moves: readonly string[],
): GameState {
  let position = fromFen(base.startFen)
  let lastMove: GameState['lastMove'] = null
  for (const uci of moves) {
    const next = play(position, fromUci(uci))
    if (!next) throw new Error(`not a legal move in this game: ${uci}`)
    position = next.position
    lastMove = { from: next.move.from, to: next.move.to }
  }
  return {
    ...base,
    moves: [...moves],
    position,
    lastMove,
    result: resultOf(status(position), base.kidColor),
  }
}

/** Plays a move (the kid's or Kukoos's); `null` if it's illegal or the game is over. */
export function applyMove(
  game: GameState,
  input: MoveInput,
): { game: GameState; move: ChessMove } | null {
  if (game.result) return null
  const next = play(game.position, input)
  if (!next) return null
  const { move, position } = next
  return {
    move,
    game: {
      ...game,
      moves: [...game.moves, toUci(move)],
      position,
      lastMove: { from: move.from, to: move.to },
      result: resultOf(status(position), game.kidColor),
    },
  }
}

export const isKidsTurn = (game: GameState) => !game.result && turn(game.position) === game.kidColor

/** Moves the kid has made (rewards need ≥ 10). */
export function kidMoves(game: Pick<GameState, 'kidColor' | 'startFen' | 'moves'>): number {
  const firstIsKid = fromFen(game.startFen).fen.split(' ')[1] === game.kidColor
  return firstIsKid ? Math.ceil(game.moves.length / 2) : Math.floor(game.moves.length / 2)
}

/**
 * How many moves **Take back** removes: the kid's last move, and Kukoos's reply if it came.
 * 0 when there's nothing of the kid's to undo (e.g. only Kukoos's first move as White).
 */
export function takeBackCount(game: GameState): number {
  if (game.result) return 0
  const plies = turn(game.position) === game.kidColor ? 2 : 1
  return kidMoves(game) > 0 && game.moves.length >= plies ? plies : 0
}

/** Undoes the kid's last move (and Kukoos's reply). Finished games stay as they are. */
export function takeBack(game: GameState): GameState {
  const n = takeBackCount(game)
  if (n === 0) return game
  return replay(game, game.moves.slice(0, game.moves.length - n))
}

/** **End game**: stopped early, never a loss (spec 017). */
export const endGame = (game: GameState): GameState =>
  game.result ? game : { ...game, result: 'ended' }
