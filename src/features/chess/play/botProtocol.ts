import type { MoveInput, Position } from '@/domain/chess'
import { bestMove, type BotLevel, chooseMove } from '@/domain/chess/bot'

/** What the game screen asks Kukoos (spec 017): a move at a level, or a hint for the kid. */
export interface BotRequest {
  fen: string
  seen: readonly string[]
  level: BotLevel
  seed: number
  kind: 'move' | 'hint'
}

/** Runs a request (in the worker, or on the main thread where workers don't exist). */
export function answer(req: BotRequest): MoveInput | null {
  const position: Position = { fen: req.fen, free: false, seen: req.seen }
  return req.kind === 'hint' ? bestMove(position) : chooseMove(position, req.level, req.seed)
}
