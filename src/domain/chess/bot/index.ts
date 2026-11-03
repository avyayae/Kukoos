import { createRng } from '../../rng'
import { repetitionKey, status } from '../position'
import type { MoveInput, Position } from '../types'
import { FastBoard, type RawMove, toInput } from './fastBoard'
import { BOT_LEVELS, type BotLevel } from './levels'
import { MATE_BOUND, Searcher } from './search'

export { BOT_LEVELS, type BotLevel, type BotLevelDef, isBotLevel, LEVELS } from './levels'

/** The hint search (spec 017): level-4 depth, no slips. */
const HINT = { depth: 3, quiesce: true, nodeBudget: 150_000 }
/** A slip never throws away more than this (when not already losing). */
const LOSING = -200

/** Root moves that would repeat the game's position a third time (a threefold draw). */
function repetitionDraws(board: FastBoard, moves: RawMove[], seen: readonly string[]) {
  const draws = new Set<RawMove>()
  for (const m of moves) {
    board.make(m)
    const key = repetitionKey(board.fen())
    board.undo()
    if (seen.filter((k) => k === key).length >= 2) draws.add(m)
  }
  return draws
}

function stalemates(board: FastBoard, m: RawMove): boolean {
  board.make(m)
  const stale = !board.inCheck() && board.legalMoves().length === 0
  board.undo()
  return stale
}

function rootSetup(position: Position) {
  if (position.free || status(position).over) return null
  const board = new FastBoard(position.fen)
  const moves = board.legalMoves()
  if (moves.length === 0) return null
  return { board, moves, draws: repetitionDraws(board, moves, position.seen) }
}

/**
 * Kukoos's move at a level (spec 017 AC1–AC3). The same position, level and seed always
 * give the same move; `null` when the game is over.
 */
export function chooseMove(position: Position, level: BotLevel, seed: number): MoveInput | null {
  const setup = rootSetup(position)
  if (!setup) return null
  const { board, moves, draws } = setup
  const def = BOT_LEVELS[level]
  const searcher = new Searcher(board, def)
  const best = searcher.deepen(moves, draws)
  const rng = createRng(seed)
  if (def.takesMates && best.score >= MATE_BOUND) return toInput(best.move)
  if (!rng.bool(def.slip)) return toInput(best.move)

  // A slip: a plausible weaker move. Never a stalemate thrown away while ahead.
  let candidates = moves.filter((m) => best.score <= LOSING || !stalemates(board, m))
  if (def.slipMargin !== null) {
    const floor = best.score - def.slipMargin
    searcher.nodes = 0
    candidates = candidates.filter((m) => m === best.move || searcher.atLeast(m, def.depth, floor))
  }
  return toInput(candidates.length > 0 ? rng.pick(candidates) : best.move)
}

/** A good move for the side to move (the kid's **Hint**, spec 017). */
export function bestMove(position: Position): MoveInput | null {
  const setup = rootSetup(position)
  if (!setup) return null
  return toInput(new Searcher(setup.board, HINT).deepen(setup.moves, setup.draws).move)
}
