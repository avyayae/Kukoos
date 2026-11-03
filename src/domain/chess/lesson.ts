import type { SkillMastery } from '../engine/mastery'
import type { LessonPhase, QuestionResult, SavedLesson } from '../engine/lessonSession'
import type { ChessMistakeKey, ChessPuzzleKind, SkillId } from '../types'
import { chessDue, getChessSkill } from './curriculum'
import { pieceAt } from './position'
import { generatePuzzle } from './puzzles/generators'
import { type PuzzleRun, runChoice, runMove, runTap, type RunStep, startRun } from './puzzles/run'
import type { Puzzle, PuzzleDifficulty } from './puzzles/types'
import type { IllegalReason, MoveInput, Square } from './types'

/** Puzzles per chess lesson (decision 2026-10-20: same as math). */
export const CHESS_LESSON_LENGTH = 8
/** Puzzles in an "Already know this?" check (spec 016 AC6). */
export const SKIP_CHECK_LENGTH = 3
/** A missed puzzle comes back at most this many times per lesson. */
export const CHESS_MAX_REQUEUES = 2

export interface PlannedPuzzle {
  skillId: SkillId
  kind: ChessPuzzleKind
  seed: number
  fixedDifficulty?: PuzzleDifficulty
  isRequeue?: boolean
}

export interface ChessLessonState extends SavedLesson {
  plan: readonly PlannedPuzzle[]
  index: number
  puzzle: Puzzle
  run: PuzzleRun
  /** Misses on this puzzle (illegal attempts don't count: the board explains them). */
  attempts: number
  /** The last hint to show (wrong move, wrong tile…). */
  hint: string | null
  /** Mistake patterns seen on this puzzle (spec 016 AC8). */
  mistakes: readonly ChessMistakeKey[]
  difficulty: PuzzleDifficulty
  firstTryStreak: number
  combo: number
  /** An "Already know this?" check rather than a lesson. */
  skipCheck: boolean
}

export type ChessLessonEvent =
  | { type: 'move'; input: MoveInput; at: number }
  | { type: 'tap'; square: Square; at: number }
  | { type: 'choice'; value: string; at: number }
  /** The board refused a move (spec 014 reason): recorded, not counted as a miss. */
  | { type: 'illegal'; reason: IllegalReason; from: Square; at: number }
  | { type: 'retry' }
  | { type: 'continue'; at: number }

const clamp = (d: number): PuzzleDifficulty => Math.min(3, Math.max(1, d)) as PuzzleDifficulty

/** Starting difficulty from how well the skill is known. */
export function startDifficulty(m: SkillMastery | undefined): PuzzleDifficulty {
  if (!m) return 1
  return m.crowned || m.mastery >= 0.5 ? 2 : 1
}

/** Kinds cycled across the lesson so every idea in the skill comes up. */
function cycle(skillIds: readonly SkillId[], length: number, seed: number): PlannedPuzzle[] {
  return Array.from({ length }, (_, i) => {
    const skillId = skillIds[i % skillIds.length] as SkillId
    const kinds = getChessSkill(skillId).kinds
    const kind = kinds[Math.floor(i / skillIds.length) % kinds.length] as ChessPuzzleKind
    return { skillId, kind, seed: seed * 101 + i * 7919 }
  })
}

export interface StartChessLesson {
  skillId: SkillId
  seed: number
  at: number
  progress?: Partial<Record<SkillId, SkillMastery>>
  /** `review`: practise the due chess skills instead of one. */
  mode?: 'skill' | 'review'
  /** "Already know this?": 3 hard puzzles (spec 016 AC6). */
  skipCheck?: boolean
}

export function startChessLesson(options: StartChessLesson): ChessLessonState {
  const { skillId, seed, at, progress = {}, mode = 'skill', skipCheck = false } = options
  const due = mode === 'review' ? chessDue(progress, at) : []
  const skills = due.length > 0 ? due : [skillId]
  const plan = skipCheck
    ? cycle([skillId], SKIP_CHECK_LENGTH, seed).map((p) => ({ ...p, fixedDifficulty: 3 as const }))
    : cycle(skills, CHESS_LESSON_LENGTH, seed)
  const difficulty = skipCheck ? 3 : startDifficulty(progress[skillId])
  const first = plan[0] as PlannedPuzzle
  const puzzle = puzzleAt(first, difficulty)
  return {
    skillId: skills[0] as SkillId,
    mode,
    worldId: null,
    seed,
    phase: 'answering',
    results: [],
    bestCombo: 0,
    startedAt: at,
    endedAt: null,
    plan,
    index: 0,
    puzzle,
    run: startRun(puzzle),
    attempts: 0,
    hint: null,
    mistakes: [],
    difficulty,
    firstTryStreak: 0,
    combo: 0,
    skipCheck,
  }
}

function puzzleAt(planned: PlannedPuzzle, difficulty: PuzzleDifficulty): Puzzle {
  return generatePuzzle(planned.skillId, {
    kind: planned.kind,
    difficulty: planned.fixedDifficulty ?? difficulty,
    seed: planned.seed,
  })
}

function result(state: ChessLessonState, solved: boolean, at: number): QuestionResult {
  return {
    skillId: state.puzzle.skillId,
    questionId: state.puzzle.id,
    kind: `chess.${state.puzzle.kind}`,
    // Puzzle difficulty 1–3 maps onto mastery's 1–5 scale.
    difficulty: (state.puzzle.difficulty * 2 - 1) as 1 | 3 | 5,
    firstTry: solved && state.attempts === 0,
    solved,
    attempts: state.attempts + (solved ? 1 : 0),
    misconceptions: state.mistakes,
    at,
  }
}

function onStep(state: ChessLessonState, step: RunStep, at: number): ChessLessonState {
  if (step.outcome === 'continue') return { ...state, run: step.run, hint: step.hint ?? null }
  if (step.outcome === 'solved') {
    const firstTry = state.attempts === 0
    let { difficulty, firstTryStreak, combo, bestCombo } = state
    if (firstTry) {
      combo += 1
      bestCombo = Math.max(bestCombo, combo)
      firstTryStreak += 1
      if (firstTryStreak >= 2) {
        difficulty = clamp(difficulty + 1)
        firstTryStreak = 0
      }
    }
    return {
      ...state,
      run: step.run,
      phase: 'correct',
      hint: null,
      difficulty,
      firstTryStreak,
      combo,
      bestCombo,
      results: [...state.results, result(state, true, at)],
    }
  }
  const attempts = state.attempts + 1
  const missed: ChessLessonState = {
    ...state,
    attempts,
    hint: step.hint ?? null,
    combo: 0,
    firstTryStreak: 0,
    difficulty: attempts === 1 ? clamp(state.difficulty - 1) : state.difficulty,
  }
  if (attempts < 2) return { ...missed, phase: 'notYet' }
  return {
    ...missed,
    phase: 'solution',
    results: [...state.results, { ...result(missed, false, at), attempts }],
  }
}

function onContinue(state: ChessLessonState, at: number): ChessLessonState {
  const current = state.plan[state.index] as PlannedPuzzle
  const requeues = state.plan.filter((p) => p.isRequeue).length
  const plan =
    state.phase === 'solution' &&
    !state.skipCheck &&
    !current.isRequeue &&
    requeues < CHESS_MAX_REQUEUES
      ? [...state.plan, { ...current, fixedDifficulty: state.puzzle.difficulty, isRequeue: true }]
      : state.plan
  const index = state.index + 1
  const next = plan[index]
  const fresh = { attempts: 0, hint: null, mistakes: [] as ChessMistakeKey[] }
  if (!next) return { ...state, ...fresh, plan, phase: 'complete' as LessonPhase, endedAt: at }
  const puzzle = puzzleAt(next, state.difficulty)
  return { ...state, ...fresh, plan, index, puzzle, run: startRun(puzzle), phase: 'answering' }
}

/** The chess lesson state machine (spec 016 AC4). Events that don't fit the phase are ignored. */
export function chessLessonReducer(
  state: ChessLessonState,
  event: ChessLessonEvent,
): ChessLessonState {
  const answering = state.phase === 'answering'
  switch (event.type) {
    case 'move':
      return answering ? onStep(state, runMove(state.run, event.input), event.at) : state
    case 'tap':
      return answering ? onStep(state, runTap(state.run, event.square), event.at) : state
    case 'choice':
      return answering ? onStep(state, runChoice(state.run, event.value), event.at) : state
    case 'illegal': {
      if (!answering) return state
      const piece = pieceAt(state.run.position, event.from)?.type
      const key: ChessMistakeKey = `chess.${event.reason}${piece ? `:${piece}` : ''}`
      return { ...state, mistakes: [...state.mistakes, key] }
    }
    case 'retry':
      // Back to the puzzle's start (stars come back, the lone king returns).
      return state.phase === 'notYet'
        ? { ...state, phase: 'answering', run: startRun(state.puzzle), hint: null }
        : state
    case 'continue':
      return state.phase === 'correct' || state.phase === 'solution'
        ? onContinue(state, event.at)
        : state
  }
}

export function chessLessonProgress(state: ChessLessonState): number {
  if (state.phase === 'complete') return 1
  return Math.min(1, state.results.length / state.plan.length)
}

/** An "Already know this?" check passes with every puzzle right on the first try. */
export function skipCheckPassed(state: ChessLessonState): boolean {
  return (
    state.skipCheck &&
    state.phase === 'complete' &&
    state.results.length === SKIP_CHECK_LENGTH &&
    state.results.every((r) => r.firstTry)
  )
}
