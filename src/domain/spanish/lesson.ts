import type { SkillMastery } from '../engine/mastery'
import type { LessonPhase, QuestionResult, SavedLesson } from '../engine/lessonSession'
import type { SkillId, SpanishKind, SpanishMistakeKey } from '../types'
import { createRng } from '../rng'
import { FIESTA, getSpanishSkill, SPANISH_SKILLS, spanishDue } from './curriculum'
import { generateSpanishQuestion, type SpanishDifficulty, type SpanishQuestion } from './questions'
import { getWord, shown } from './words'

/** Scored questions per Spanish lesson (skill map: the same as math and chess). */
export const SPANISH_LESSON_LENGTH = 8
/** Questions in an "Already know these words?" check (spec 019 AC7). */
export const SPANISH_SKIP_CHECK_LENGTH = 3
/** A missed question comes back at most this many times per lesson. */
export const SPANISH_MAX_REQUEUES = 2
/** The `say` step comes after this many scored questions (decision 2026-11-03). */
export const SAY_AFTER = 4

export interface PlannedSpanish {
  skillId: SkillId
  kind: SpanishKind
  seed: number
  fixedDifficulty?: SpanishDifficulty
  isRequeue?: boolean
}

export interface SpanishLessonState extends SavedLesson {
  plan: readonly PlannedSpanish[]
  index: number
  question: SpanishQuestion
  /** Misses on this question. */
  attempts: number
  hint: string | null
  /** Mix-ups seen on this question (spec 019 AC8). */
  mistakes: readonly SpanishMistakeKey[]
  /** `match`: the words already joined to their picture. */
  matched: readonly string[]
  difficulty: SpanishDifficulty
  firstTryStreak: number
  combo: number
  skipCheck: boolean
}

export type SpanishLessonEvent =
  /** `listen`, `see`, `count`: the word whose card or tile was chosen. */
  | { type: 'choice'; wordId: string; at: number }
  /** `match`: a word joined to the picture of `pictureId`. */
  | { type: 'pair'; wordId: string; pictureId: string; at: number }
  /** `say`: "I said it!" (practice, never scored). */
  | { type: 'said' }
  | { type: 'retry' }
  | { type: 'continue'; at: number }

const clamp = (d: number): SpanishDifficulty => Math.min(3, Math.max(1, d)) as SpanishDifficulty

/** Starting difficulty from how well the skill is known. */
export function startDifficulty(m: SkillMastery | undefined): SpanishDifficulty {
  if (!m) return 1
  return m.crowned || m.mastery >= 0.5 ? 2 : 1
}

/** Without speech, a kid can't hear the word: those kinds become `see` (spec 019 AC9). */
const heard = (kind: SpanishKind, canHear: boolean): SpanishKind =>
  canHear || kind === 'see' || kind === 'match' ? kind : 'see'

/** Kinds cycled across the lesson so every kind in the skill comes up. */
function cycle(
  skillIds: readonly SkillId[],
  length: number,
  seed: number,
  canHear: boolean,
): PlannedSpanish[] {
  return Array.from({ length }, (_, i) => {
    const skillId = skillIds[i % skillIds.length] as SkillId
    const kinds = getSpanishSkill(skillId).kinds
    const kind = kinds[Math.floor(i / skillIds.length) % kinds.length] as SpanishKind
    return { skillId, kind: heard(kind, canHear), seed: seed * 101 + i * 7919 }
  })
}

export interface StartSpanishLesson {
  skillId: SkillId
  seed: number
  at: number
  progress?: Partial<Record<SkillId, SkillMastery>>
  /** `review`: practise the due Spanish skills instead of one. */
  mode?: 'skill' | 'review'
  /** "Already know these words?": 3 hard `listen` questions (spec 019 AC7). */
  skipCheck?: boolean
  /** Whether this device can speak (spec 019 AC9). */
  canHear?: boolean
  /** ¡Fiesta! (spec 020 AC4): 8 questions from 8 skills across the island. */
  fiesta?: boolean
}

/** The fiesta: 8 different skills picked by seed, one kind each, at difficulty 2 and 3. */
function fiestaPlan(seed: number, canHear: boolean): PlannedSpanish[] {
  const rng = createRng(seed)
  return rng
    .shuffle(SPANISH_SKILLS)
    .slice(0, SPANISH_LESSON_LENGTH)
    .map((skill, i) => ({
      skillId: skill.id,
      kind: heard(rng.pick(skill.kinds), canHear),
      seed: seed * 101 + i * 7919,
      fixedDifficulty: (i % 2 === 0 ? 2 : 3) as SpanishDifficulty,
    }))
}

export function startSpanishLesson(options: StartSpanishLesson): SpanishLessonState {
  const { skillId, seed, at, progress = {}, mode = 'skill', skipCheck = false } = options
  const canHear = options.canHear ?? true
  const fiesta = options.fiesta ?? false
  const due = mode === 'review' ? spanishDue(progress, at) : []
  const skills = due.length > 0 ? due : [skillId]
  let plan: PlannedSpanish[]
  if (fiesta) {
    plan = fiestaPlan(seed, canHear)
  } else if (skipCheck) {
    plan = Array.from({ length: SPANISH_SKIP_CHECK_LENGTH }, (_, i) => ({
      skillId,
      kind: heard('listen', canHear),
      seed: seed * 101 + i * 7919,
      fixedDifficulty: 3 as const,
    }))
  } else {
    plan = cycle(skills, SPANISH_LESSON_LENGTH, seed, canHear)
    // Say it once, on the word just practised (practice only, never scored).
    if (canHear && mode === 'skill') {
      const after = plan[SAY_AFTER - 1] as PlannedSpanish
      plan.splice(SAY_AFTER, 0, { skillId: after.skillId, kind: 'say', seed: after.seed })
    }
  }
  const difficulty = skipCheck ? 3 : fiesta ? 2 : startDifficulty(progress[skillId])
  const first = plan[0] as PlannedSpanish
  return {
    // The fiesta is saved as its own lesson, so its first finish can be celebrated once.
    skillId: fiesta ? FIESTA : (skills[0] as SkillId),
    // `skill` mode, so the finished fiesta counts in best scores (its stop is crowned).
    mode: fiesta ? 'skill' : mode,
    worldId: null,
    seed,
    phase: 'answering',
    results: [],
    bestCombo: 0,
    startedAt: at,
    endedAt: null,
    plan,
    index: 0,
    question: questionAt(first, difficulty),
    attempts: 0,
    hint: null,
    mistakes: [],
    matched: [],
    difficulty,
    firstTryStreak: 0,
    combo: 0,
    skipCheck,
  }
}

function questionAt(planned: PlannedSpanish, difficulty: SpanishDifficulty): SpanishQuestion {
  return generateSpanishQuestion(planned.skillId, {
    kind: planned.kind,
    difficulty: planned.fixedDifficulty ?? difficulty,
    seed: planned.seed,
  })
}

function result(state: SpanishLessonState, solved: boolean, at: number): QuestionResult {
  const q = state.question
  return {
    skillId: q.skillId,
    questionId: q.id,
    kind: `es.${q.kind}`,
    // Difficulty 1–3 maps onto mastery's 1–5 scale.
    difficulty: (q.difficulty * 2 - 1) as 1 | 3 | 5,
    firstTry: solved && state.attempts === 0,
    solved,
    attempts: state.attempts + (solved ? 1 : 0),
    misconceptions: state.mistakes,
    at,
  }
}

function solved(state: SpanishLessonState, at: number): SpanishLessonState {
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
    hint: null,
    difficulty,
    firstTryStreak,
    combo,
    bestCombo,
    results: [...state.results, result(state, true, at)],
  }
}

function missed(state: SpanishLessonState, mixup: SpanishMistakeKey, hint: string, at: number) {
  const attempts = state.attempts + 1
  const next: SpanishLessonState = {
    ...state,
    attempts,
    hint,
    mistakes: [...state.mistakes, mixup],
    combo: 0,
    firstTryStreak: 0,
    difficulty: attempts === 1 ? clamp(state.difficulty - 1) : state.difficulty,
  }
  if (attempts < 2) return { ...next, phase: 'notYet' as const }
  return {
    ...next,
    phase: 'solution' as const,
    results: [...state.results, { ...result(next, false, at), attempts }],
  }
}

const mixupKey = (answerId: string, pickedId: string): SpanishMistakeKey =>
  `es.mixup:${answerId}~${pickedId}`

function onChoice(state: SpanishLessonState, wordId: string, at: number): SpanishLessonState {
  const q = state.question
  if (q.kind === 'say' || q.kind === 'match') return state
  if (!q.choices.some((c) => c.id === wordId)) return state
  if (wordId === q.answer.id) return solved(state, at)
  const picked = getWord(wordId)
  const hint =
    q.kind === 'see' && picked
      ? `That word means “${picked.en}”. Try again!`
      : 'Listen again and try once more!'
  return missed(state, mixupKey(q.answer.id, wordId), hint, at)
}

function onPair(state: SpanishLessonState, wordId: string, pictureId: string, at: number) {
  const q = state.question
  if (q.kind !== 'match') return state
  const ids = q.choices.map((c) => c.id)
  if (!ids.includes(wordId) || !ids.includes(pictureId) || state.matched.includes(wordId)) {
    return state
  }
  if (wordId !== pictureId) {
    return missed(
      state,
      mixupKey(wordId, pictureId),
      'Not that pair. Tap a word to hear it again!',
      at,
    )
  }
  const matched = [...state.matched, wordId]
  const next = { ...state, matched }
  return matched.length === ids.length ? solved(next, at) : next
}

function onContinue(state: SpanishLessonState, at: number): SpanishLessonState {
  const current = state.plan[state.index] as PlannedSpanish
  const requeues = state.plan.filter((p) => p.isRequeue).length
  const plan =
    state.phase === 'solution' &&
    !state.skipCheck &&
    !current.isRequeue &&
    requeues < SPANISH_MAX_REQUEUES
      ? [...state.plan, { ...current, fixedDifficulty: state.question.difficulty, isRequeue: true }]
      : state.plan
  const index = state.index + 1
  const next = plan[index]
  const fresh = { attempts: 0, hint: null, mistakes: [] as SpanishMistakeKey[], matched: [] }
  if (!next) return { ...state, ...fresh, plan, phase: 'complete' as LessonPhase, endedAt: at }
  return {
    ...state,
    ...fresh,
    plan,
    index,
    question: questionAt(next, state.difficulty),
    phase: 'answering',
  }
}

/** The Spanish lesson state machine (spec 019 AC4). Events that don't fit the phase are ignored. */
export function spanishLessonReducer(
  state: SpanishLessonState,
  event: SpanishLessonEvent,
): SpanishLessonState {
  const answering = state.phase === 'answering'
  switch (event.type) {
    case 'choice':
      return answering ? onChoice(state, event.wordId, event.at) : state
    case 'pair':
      return answering ? onPair(state, event.wordId, event.pictureId, event.at) : state
    case 'said':
      // Kukoos claps no matter what: practice, not a test.
      return answering && state.question.kind === 'say' ? { ...state, phase: 'correct' } : state
    case 'retry':
      return state.phase === 'notYet' ? { ...state, phase: 'answering', hint: null } : state
    case 'continue':
      return state.phase === 'correct' || state.phase === 'solution'
        ? onContinue(state, event.at)
        : state
  }
}

/** Scored questions in the plan (the `say` step isn't one). */
export const scoredCount = (state: Pick<SpanishLessonState, 'plan'>) =>
  state.plan.filter((p) => p.kind !== 'say').length

export function spanishLessonProgress(state: SpanishLessonState): number {
  if (state.phase === 'complete') return 1
  return Math.min(1, state.results.length / scoredCount(state))
}

/** An "Already know these words?" check passes with every question right on the first try. */
export function skipCheckPassed(state: SpanishLessonState): boolean {
  return (
    state.skipCheck &&
    state.phase === 'complete' &&
    state.results.length === SPANISH_SKIP_CHECK_LENGTH &&
    state.results.every((r) => r.firstTry)
  )
}

/** The answer, in words, after two misses: "el perro: dog". */
export function solutionText(state: SpanishLessonState): string {
  const q = state.question
  if (q.kind === 'match') return 'Here are the pairs.'
  return `${shown(q.answer)}: ${q.answer.en}.`
}
