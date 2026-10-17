import { getSkill } from '../curriculum/skillGraph'
import { SKILLS } from '../curriculum/skills'
import type { Difficulty, QuestionKind, Skill, SkillId } from '../types'
import { isDue, type SkillMastery } from './mastery'

/**
 * Builds lessons from what the kid knows (spec 006): concrete → pictorial → abstract by
 * mastery, plus spaced reviews of crowned skills and a stretch question when ready.
 */
export const LESSON_LENGTH = 10
const MAX_REVIEWS_IN_LESSON = 2
const REVIEW_SLOTS = [3, 6] as const
const STRETCH_SLOT = 8
const REVIEW_DIFFICULTY: Difficulty = 3
const REVIEW_PER_SKILL = 3

export type QuestionRole = 'focus' | 'review' | 'stretch'

export interface PlannedQuestion {
  skillId: SkillId
  kind: QuestionKind
  /** Column questions: Kukoos walks through one column at a time. */
  guided: boolean
  seed: number
  role: QuestionRole
  /** Reviews, stretches and re-queues use a fixed difficulty; focus questions follow the staircase. */
  fixedDifficulty?: Difficulty
  isRequeue: boolean
}

export type Progress = Readonly<Partial<Record<SkillId, SkillMastery>>>

type Band = 'new' | 'forming' | 'solid'
interface Want {
  kind: QuestionKind
  guided?: boolean
}

const w = (kind: QuestionKind, guided = false): Want => ({ kind, guided })
const BANDS: Record<Band, readonly Want[]> = {
  new: [
    w('tradeBlocks'),
    w('tradeBlocks'),
    w('tradeBlocks'),
    w('column', true),
    w('column', true),
    w('column', true),
    w('numeric'),
    w('mcq'),
    w('numeric'),
    w('mcq'),
  ],
  forming: [
    w('column', true),
    w('column', true),
    w('column'),
    w('column'),
    w('column'),
    w('numeric'),
    w('mcq'),
    w('trueFalse'),
    w('column'),
    w('numeric'),
  ],
  solid: [
    w('column'),
    w('numeric'),
    w('mcq'),
    w('column'),
    w('trueFalse'),
    w('numeric'),
    w('column'),
    w('mcq'),
    w('column'),
    w('numeric'),
  ],
}

/** If a skill can't do the wanted kind, try these instead (in order). */
const FALLBACK: Record<QuestionKind, readonly Want[]> = {
  tradeBlocks: [w('column', true), w('numeric')],
  column: [w('numeric'), w('mcq')],
  trueFalse: [w('mcq'), w('numeric')],
  mcq: [w('numeric'), w('trueFalse')],
  numeric: [w('mcq'), w('trueFalse')],
  compare: [w('numeric'), w('mcq')],
}

export function bandFor(mastery: number): Band {
  if (mastery < 0.3) return 'new'
  if (mastery <= 0.6) return 'forming'
  return 'solid'
}

/** First difficulty of a lesson: 1 + round(m × 3), so 1–4. */
export function startDifficulty(mastery: number): Difficulty {
  return (1 + Math.round(Math.min(1, Math.max(0, mastery)) * 3)) as Difficulty
}

function fit(skill: Skill, want: Want, i: number, band: Band): Want {
  const supports = (k: QuestionKind) => skill.kinds.includes(k)
  if (supports(want.kind))
    return { kind: want.kind, guided: want.kind === 'column' && !!want.guided }
  for (const alt of FALLBACK[want.kind]) {
    if (supports(alt.kind)) return { kind: alt.kind, guided: alt.kind === 'column' && !!alt.guided }
  }
  // Last resort: rotate through the skill's own kinds (no blocks once a skill is solid,
  // unless blocks are all it has).
  const pool =
    band === 'solid' && skill.kinds.some((k) => k !== 'tradeBlocks')
      ? skill.kinds.filter((k) => k !== 'tradeBlocks')
      : skill.kinds
  return { kind: pool[i % pool.length] as QuestionKind, guided: false }
}

/** The kinds a lesson on `skill` uses at this mastery, all supported by the skill. */
export function kindsForMastery(skill: Skill, mastery: number): Want[] {
  const band = bandFor(mastery)
  return BANDS[band].map((want, i) => fit(skill, want, i, band))
}

function reviewKind(skill: Skill, n: number): QuestionKind {
  const preferred: QuestionKind[] = n % 2 === 0 ? ['numeric', 'mcq'] : ['mcq', 'numeric']
  return preferred.find((k) => skill.kinds.includes(k)) ?? (skill.kinds[0] as QuestionKind)
}

/** Crowned skills due for review, most overdue first. */
export function dueSkills(progress: Progress, now: number, exclude?: SkillId): SkillId[] {
  return SKILLS.map((s) => s.id)
    .filter((id) => id !== exclude && isDue(progress[id], now))
    .sort((a, b) => (progress[a]?.nextReviewAt ?? 0) - (progress[b]?.nextReviewAt ?? 0))
}

export interface ComposeOptions {
  focusSkillId: SkillId
  progress: Progress
  now: number
  seed: number
}

export interface ComposedLesson {
  plan: PlannedQuestion[]
  startDifficulty: Difficulty
}

/** A 10-question lesson on one skill, with due reviews and a stretch mixed in (AC3, AC4). */
export function composeLesson({
  focusSkillId,
  progress,
  now,
  seed,
}: ComposeOptions): ComposedLesson {
  const skill = getSkill(focusSkillId)
  const mastery = progress[focusSkillId]?.mastery ?? 0
  const start = startDifficulty(mastery)
  const reviews = dueSkills(progress, now, focusSkillId).slice(0, MAX_REVIEWS_IN_LESSON)
  const stretch = mastery >= 0.5
  const focusCount = LESSON_LENGTH - reviews.length - (stretch ? 1 : 0)

  const slots: Omit<PlannedQuestion, 'seed' | 'isRequeue'>[] = kindsForMastery(skill, mastery)
    .slice(0, focusCount)
    .map((k) => ({ skillId: focusSkillId, kind: k.kind, guided: !!k.guided, role: 'focus' }))

  reviews.forEach((id, n) => {
    const reviewSkill = getSkill(id)
    slots.splice(REVIEW_SLOTS[n] ?? slots.length, 0, {
      skillId: id,
      kind: reviewKind(reviewSkill, n),
      guided: false,
      role: 'review',
      fixedDifficulty: REVIEW_DIFFICULTY,
    })
  })

  if (stretch) {
    const k = kindsForMastery(skill, 1)[0] as Want
    slots.splice(Math.min(STRETCH_SLOT, slots.length), 0, {
      skillId: focusSkillId,
      kind: k.kind,
      guided: false,
      role: 'stretch',
      fixedDifficulty: Math.min(5, start + 1) as Difficulty,
    })
  }

  return {
    plan: slots.map((s, i) => ({ ...s, seed: seed * 1000 + i, isRequeue: false })),
    startDifficulty: start,
  }
}

/** The Review mission: up to 10 questions over due skills, round-robin, most overdue first (AC5). */
export function composeReview(progress: Progress, now: number, seed: number): PlannedQuestion[] {
  const due = dueSkills(progress, now)
  const length = Math.min(LESSON_LENGTH, due.length * REVIEW_PER_SKILL)
  return Array.from({ length }, (_, i) => {
    const id = due[i % due.length] as SkillId
    return {
      skillId: id,
      kind: reviewKind(getSkill(id), Math.floor(i / due.length)),
      guided: false,
      seed: seed * 1000 + i,
      role: 'review' as const,
      fixedDifficulty: REVIEW_DIFFICULTY,
      isRequeue: false,
    }
  })
}
