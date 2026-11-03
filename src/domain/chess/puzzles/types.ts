import type { ChessPuzzleKind, SkillId } from '../../types'
import type { MoveInput, Position, Square } from '../types'

export type PuzzleDifficulty = 1 | 2 | 3

/** What's drawn on top of the board (not pieces). */
export interface PuzzleMarks {
  /** ⭐ to land on (`reach`) or collect (`stars`). */
  stars?: readonly Square[]
  /** 🎯 the piece to capture. */
  target?: Square
  /** The piece the kid should move (highlighted). */
  focus?: Square
}

/**
 * One chess puzzle (spec 016). Generated from a seed or picked from a validated list, so
 * the same id always gives the same puzzle. The rules engine decides every answer (§3.4).
 */
export interface Puzzle {
  /** `${skillId}:${difficulty}:${kind}:${seed}` */
  id: string
  skillId: SkillId
  kind: ChessPuzzleKind
  difficulty: PuzzleDifficulty
  seed: number
  prompt: { text: string; speech: string }
  position: Position
  marks: PuzzleMarks
  /** `find`: the right squares to tap. `reach` / `capture`: the right landing squares. */
  squares?: readonly Square[]
  /** `count` / `which`: the tiles to choose from, and the right one. */
  choices?: readonly string[]
  answer?: string
  /** `stars` / `mate`: moves allowed. */
  maxMoves?: number
  /** Shown after a second miss: one right move, square or choice. */
  solution: { move?: MoveInput; square?: Square; choice?: string }
}
