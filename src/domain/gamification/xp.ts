import type { LessonMode } from '../engine/lessonSession'

/** Rewards per lesson (spec 008). Only completed lessons earn anything. */
export const XP_RULES = { base: 10, perfect: 5, comboStep: 3, comboMax: 5, boss: 20 } as const
export const GEM_RULES = { lesson: 5, chest: 5, badge: 10, boss: 10 } as const
/** Reaching level n + 1 needs LEVEL_STEP · n(n+1)/2 total XP: 50, 150, 300, 500, … */
export const LEVEL_STEP = 50

export interface LessonSummary {
  completed: boolean
  mode: LessonMode
  questionCount: number
  firstTryCorrect: number
  bestCombo: number
  /** Boss challenges only: passed with ≥ 80% first try. */
  bossPassed: boolean
}

export function isPerfect(s: LessonSummary): boolean {
  return s.completed && s.questionCount > 0 && s.firstTryCorrect === s.questionCount
}

export function lessonXp(s: LessonSummary): number {
  if (!s.completed) return 0
  const combo = Math.min(XP_RULES.comboMax, Math.floor(s.bestCombo / XP_RULES.comboStep))
  return (
    XP_RULES.base +
    (isPerfect(s) ? XP_RULES.perfect : 0) +
    combo +
    (s.bossPassed ? XP_RULES.boss : 0)
  )
}

/** Crystals from the lesson itself (badges add theirs separately). */
export function lessonGems(s: LessonSummary): number {
  if (!s.completed) return 0
  return (
    GEM_RULES.lesson + (isPerfect(s) ? GEM_RULES.chest : 0) + (s.bossPassed ? GEM_RULES.boss : 0)
  )
}

/** Total XP needed to reach a level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const n = Math.max(0, level - 1)
  return (LEVEL_STEP * n * (n + 1)) / 2
}

export function levelFor(xpTotal: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xpTotal) level += 1
  return level
}
