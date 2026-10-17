import type { Difficulty } from '../types'

/**
 * Mastery & spaced review (spec 006). Pure rules: callers pass timestamps in.
 */
export type SrsBox = 1 | 2 | 3 | 4 | 5

export interface SkillMastery {
  /** 0–1 */
  mastery: number
  /** Questions answered on this skill. */
  attempts: number
  /** Lessons that included this skill. */
  sessionsSeen: number
  srsBox: SrsBox
  /** ms; when the skill is next due for review (crowned skills). */
  nextReviewAt: number
  crowned: boolean
  /** Set by a grown-up's starting point rather than earned. */
  preMastered: boolean
}

export const MASTERY_RULES = {
  baseAlpha: 0.15,
  crownAt: 0.85,
  uncrownBelow: 0.7,
  minAttempts: 15,
  minSessions: 2,
  reviewPassAccuracy: 0.8,
} as const

export const SRS_INTERVAL_DAYS: Record<SrsBox, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 }
export const DAY_MS = 24 * 60 * 60 * 1000

export function newMastery(): SkillMastery {
  return {
    mastery: 0,
    attempts: 0,
    sessionsSeen: 0,
    srsBox: 1,
    nextReviewAt: 0,
    crowned: false,
    preMastered: false,
  }
}

/** The answer facts mastery needs (a QuestionResult satisfies this). */
export interface AnswerOutcome {
  firstTry: boolean
  solved: boolean
  difficulty: Difficulty
}

/** 1 = right first try, 0.5 = right after a hint/retry, 0 = not solved. */
export function answerScore(o: Pick<AnswerOutcome, 'firstTry' | 'solved'>): number {
  if (o.firstTry) return 1
  return o.solved ? 0.5 : 0
}

/** Harder questions move mastery a bit more: d1 → 0.135 … d5 → 0.195. */
export function alphaFor(difficulty: Difficulty): number {
  return MASTERY_RULES.baseAlpha * (0.8 + 0.1 * difficulty)
}

export function applyAnswer(m: SkillMastery, o: AnswerOutcome): SkillMastery {
  const next = m.mastery + alphaFor(o.difficulty) * (answerScore(o) - m.mastery)
  return { ...m, mastery: Math.min(1, Math.max(0, next)), attempts: m.attempts + 1 }
}

/** Crown with a gap: earn at ≥ 0.85 (with enough practice), lose only below 0.70. */
export function crownedAfter(m: SkillMastery): boolean {
  if (m.crowned) return m.mastery >= MASTERY_RULES.uncrownBelow
  return (
    m.mastery >= MASTERY_RULES.crownAt &&
    m.attempts >= MASTERY_RULES.minAttempts &&
    m.sessionsSeen >= MASTERY_RULES.minSessions
  )
}

export function nextBox(box: SrsBox, passed: boolean): SrsBox {
  return passed ? (Math.min(5, box + 1) as SrsBox) : 1
}

/**
 * Applies one lesson's answers on a skill: mastery per answer, one more session,
 * crown update, and the Leitner box / next review time.
 */
export function applyLesson(
  prev: SkillMastery | undefined,
  outcomes: readonly AnswerOutcome[],
  at: number,
): SkillMastery {
  const start = prev ?? newMastery()
  if (outcomes.length === 0) return start
  const answered = outcomes.reduce(applyAnswer, start)
  const withSession = { ...answered, sessionsSeen: answered.sessionsSeen + 1 }
  const crowned = crownedAfter(withSession)
  const accuracy = outcomes.filter((o) => o.firstTry).length / outcomes.length
  const srsBox = nextBox(start.srsBox, accuracy >= MASTERY_RULES.reviewPassAccuracy)
  return {
    ...withSession,
    crowned,
    preMastered: crowned ? withSession.preMastered : false,
    srsBox,
    nextReviewAt: at + SRS_INTERVAL_DAYS[srsBox] * DAY_MS,
  }
}

/** A crowned skill is due for review once its review time has come. */
export function isDue(m: SkillMastery | undefined, now: number): boolean {
  return !!m && m.crowned && now >= m.nextReviewAt
}
