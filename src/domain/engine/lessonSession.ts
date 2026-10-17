import { check } from '../generators/check'
import { generateQuestion } from '../generators/registry'
import type {
  CheckResult,
  Difficulty,
  MisconceptionKey,
  Question,
  QuestionKind,
  Response,
  SkillId,
} from '../types'
import { composeLesson, LESSON_LENGTH, type PlannedQuestion } from './lessonComposer'

export { LESSON_LENGTH, type PlannedQuestion }

/** A missed question comes back at most this many times per lesson (10 + 2 = 12 max). */
export const MAX_REQUEUES = 2

export interface QuestionResult {
  /** The skill this question practised (reviews differ from the lesson's focus skill). */
  skillId: SkillId
  questionId: string
  kind: QuestionKind
  difficulty: Difficulty
  firstTry: boolean
  solved: boolean
  attempts: number
  misconceptions: readonly MisconceptionKey[]
  /** When the question was finished (ms). */
  at: number
}

export type LessonPhase = 'answering' | 'correct' | 'notYet' | 'solution' | 'complete'

export interface LessonState {
  /** The focus skill (for a Review mission: the first reviewed skill). */
  skillId: SkillId
  mode: LessonMode
  seed: number
  plan: readonly PlannedQuestion[]
  index: number
  question: Question
  guided: boolean
  phase: LessonPhase
  /** Wrong attempts on the current question. */
  attempts: number
  wrongResponses: readonly Response[]
  /** Misconceptions diagnosed on the current question. */
  misconceptions: readonly MisconceptionKey[]
  lastCheck: CheckResult | null
  /** Staircase difficulty for the next freshly generated question. */
  difficulty: Difficulty
  firstTryStreak: number
  combo: number
  bestCombo: number
  results: readonly QuestionResult[]
  startedAt: number
  endedAt: number | null
}

export type LessonEvent =
  | { type: 'answer'; response: Response; at: number }
  | { type: 'retry' }
  | { type: 'continue'; at: number }

export type LessonMode = 'skill' | 'review'

export interface StartLessonOptions {
  skillId: SkillId
  seed: number
  at: number
  /** A composed plan (spec 006). Without one, the plan for a brand-new skill is used. */
  plan?: readonly PlannedQuestion[]
  difficulty?: Difficulty
  mode?: LessonMode
}

const clamp = (d: number): Difficulty => Math.min(5, Math.max(1, d)) as Difficulty

function questionAt(planned: PlannedQuestion, difficulty: Difficulty): Question {
  return generateQuestion(planned.skillId, {
    difficulty: planned.fixedDifficulty ?? difficulty,
    kind: planned.kind,
    seed: planned.seed,
  })
}

const freshQuestionState = {
  phase: 'answering',
  attempts: 0,
  wrongResponses: [],
  misconceptions: [],
  lastCheck: null,
} as const

/**
 * Starts a lesson from a composed plan (spec 006). Seeds come from the plan, so a seeded
 * lesson is reproducible. Without a plan, the brand-new-skill plan is composed.
 */
export function startLesson(options: StartLessonOptions): LessonState {
  const { skillId, seed, at, mode = 'skill' } = options
  const composed = options.plan
    ? null
    : composeLesson({ focusSkillId: skillId, progress: {}, now: at, seed })
  const plan = options.plan ?? composed?.plan ?? []
  const difficulty = options.difficulty ?? composed?.startDifficulty ?? 2
  const first = plan[0]
  if (!first) throw new Error('Cannot start a lesson with an empty plan')
  return {
    ...freshQuestionState,
    skillId,
    mode,
    seed,
    plan,
    index: 0,
    question: questionAt(first, difficulty),
    guided: first.guided,
    difficulty,
    firstTryStreak: 0,
    combo: 0,
    bestCombo: 0,
    results: [],
    startedAt: at,
    endedAt: null,
  }
}

function resultOf(
  state: LessonState,
  solved: boolean,
  attempts: number,
  at: number,
): QuestionResult {
  return {
    skillId: state.question.skillId,
    questionId: state.question.id,
    kind: state.question.kind,
    difficulty: state.question.difficulty,
    firstTry: solved && state.attempts === 0,
    solved,
    attempts,
    misconceptions: state.misconceptions,
    at,
  }
}

function onAnswer(state: LessonState, response: Response, at: number): LessonState {
  const result = check(state.question, response)

  if (result.correct) {
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
      phase: 'correct',
      lastCheck: result,
      difficulty,
      firstTryStreak,
      combo,
      bestCombo,
      results: [...state.results, resultOf(state, true, state.attempts + 1, at)],
    }
  }

  const attempts = state.attempts + 1
  const missed: LessonState = {
    ...state,
    attempts,
    wrongResponses: [...state.wrongResponses, response],
    misconceptions: result.misconception
      ? [...state.misconceptions, result.misconception]
      : state.misconceptions,
    lastCheck: result,
    combo: 0,
    firstTryStreak: 0,
    // Step down once per question, on the first miss.
    difficulty: attempts === 1 ? clamp(state.difficulty - 1) : state.difficulty,
  }
  if (attempts < 2) return { ...missed, phase: 'notYet' }
  return {
    ...missed,
    phase: 'solution',
    results: [...state.results, resultOf(missed, false, attempts, at)],
  }
}

function onContinue(state: LessonState, at: number): LessonState {
  const current = state.plan[state.index] as PlannedQuestion
  const requeues = state.plan.filter((p) => p.isRequeue).length
  const plan =
    state.phase === 'solution' && !current.isRequeue && requeues < MAX_REQUEUES
      ? [...state.plan, { ...current, fixedDifficulty: state.question.difficulty, isRequeue: true }]
      : state.plan
  const index = state.index + 1
  const next = plan[index]
  if (!next) {
    return { ...state, ...freshQuestionState, plan, phase: 'complete', endedAt: at }
  }
  return {
    ...state,
    ...freshQuestionState,
    plan,
    index,
    question: questionAt(next, state.difficulty),
    guided: next.guided,
  }
}

/** Pure lesson state machine (spec 005 AC2). Events that don't fit the phase are ignored. */
export function lessonReducer(state: LessonState, event: LessonEvent): LessonState {
  switch (event.type) {
    case 'answer':
      return state.phase === 'answering' ? onAnswer(state, event.response, event.at) : state
    case 'retry':
      return state.phase === 'notYet' ? { ...state, phase: 'answering' } : state
    case 'continue':
      return state.phase === 'correct' || state.phase === 'solution'
        ? onContinue(state, event.at)
        : state
  }
}

// ------------------------------------------------------------------ selectors

export function lessonProgress(state: LessonState): number {
  if (state.phase === 'complete') return 1
  return Math.min(1, state.results.length / state.plan.length)
}

export function firstTryAccuracy(state: LessonState): number {
  if (state.results.length === 0) return 0
  return state.results.filter((r) => r.firstTry).length / state.results.length
}

export function lessonMinutes(state: LessonState): number {
  return ((state.endedAt ?? state.startedAt) - state.startedAt) / 60000
}
