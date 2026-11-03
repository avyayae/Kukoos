import { getSkill, skillsInWorld } from './curriculum/skillGraph'
import { SKILLS } from './curriculum/skills'
import { WORLDS } from './curriculum/worlds'
import { isDue } from './engine/mastery'
import type { Progress } from './engine/lessonComposer'
import type { LessonMode } from './engine/lessonSession'
import { addDays, localDate, type LocalDate } from './gamification/dates'
import type { MisconceptionKey, MistakeKey, SkillId, WorldId } from './types'

/** Plain records the parent report reads (spec 011 AC6); storage maps its rows to these. */
export interface ReportAttempt {
  skillId: SkillId
  firstTry: boolean
  misconceptions: readonly MistakeKey[]
  at: number
}
export interface ReportLesson {
  skillId: SkillId
  mode?: LessonMode | undefined
  completed: boolean
  endedAt: number
}
export interface ReportDay {
  date: LocalDate
  lessonSeconds: number
  totalSeconds: number
}
export interface ReportBadge {
  badgeId: string
  unlockedAt: number
}

export interface ParentReportInput {
  attempts: readonly ReportAttempt[]
  lessons: readonly ReportLesson[]
  days: readonly ReportDay[]
  progress: Progress
  badges: readonly ReportBadge[]
  now: number
}

export const REPORT_DAYS = 14
const WEEK = 7
/** Below this first-try rate (with enough answers) a skill needs practice. */
export const STRUGGLE_PCT = 0.6
const STRUGGLE_MIN_ANSWERS = 3
const LIST_MAX = 5

export interface DayReport {
  date: LocalDate
  lessonMinutes: number
  totalMinutes: number
  answers: number
  /** 0–1, or `null` on days without answers. */
  firstTryPct: number | null
}

export interface SkillReport {
  skillId: SkillId
  title: string
  mastery: number
  crowned: boolean
  preMastered: boolean
  attempts: number
}

export interface PracticeItem {
  skillId: SkillId
  title: string
  reason: 'struggling' | 'review'
  firstTryPct: number | null
  mastery: number
}

export interface MistakeCount {
  key: MisconceptionKey
  week: number
  fortnight: number
}

export interface ParentReport {
  totals: {
    missions: number
    minutes: number
    answers: number
    firstTryPct: number | null
  }
  /** Oldest first, ending today. */
  days: DayReport[]
  mastery: { worldId: WorldId; skills: SkillReport[] }[]
  needsPractice: PracticeItem[]
  /** Most frequent this week first. */
  misconceptions: MistakeCount[]
  /** Newest first, at most 5. */
  recentBadges: ReportBadge[]
}

const pct = (hits: number, total: number) => (total === 0 ? null : hits / total)

const MATH_SKILLS = new Set<SkillId>(SKILLS.map((s) => s.id))
const isMathMistake = (key: MistakeKey): key is MisconceptionKey => !key.startsWith('chess.')

/**
 * The report covers the math course only (chess joins the dashboard in F18). Chess lessons,
 * answers, mastery and mistake keys are left out here, so nothing math-specific sees them.
 */
function mathOnly(input: ParentReportInput): ParentReportInput {
  return {
    ...input,
    attempts: input.attempts.filter((a) => MATH_SKILLS.has(a.skillId)),
    lessons: input.lessons.filter((l) => MATH_SKILLS.has(l.skillId)),
    progress: Object.fromEntries(
      Object.entries(input.progress).filter(([id]) => MATH_SKILLS.has(id)),
    ),
  }
}

/** How the kid is doing, for grown-ups (spec 011 AC6). Pure and deterministic. */
export function parentReport(all: ParentReportInput): ParentReport {
  const input = mathOnly(all)
  const today = localDate(input.now)
  const dates = Array.from({ length: REPORT_DAYS }, (_, i) => addDays(today, i - REPORT_DAYS + 1))
  const first = dates[0] as LocalDate
  const weekStart = addDays(today, -(WEEK - 1))
  const inWindow = (at: number) => localDate(at) >= first
  const recent = input.attempts.filter((a) => inWindow(a.at))

  const byDay = new Map<LocalDate, ReportAttempt[]>()
  for (const a of recent) {
    const d = localDate(a.at)
    byDay.set(d, [...(byDay.get(d) ?? []), a])
  }
  const dayRows = new Map(input.days.map((d) => [d.date, d]))
  const days: DayReport[] = dates.map((date) => {
    const answers = byDay.get(date) ?? []
    const row = dayRows.get(date)
    return {
      date,
      lessonMinutes: Math.round((row?.lessonSeconds ?? 0) / 60),
      totalMinutes: Math.round((row?.totalSeconds ?? 0) / 60),
      answers: answers.length,
      firstTryPct: pct(answers.filter((a) => a.firstTry).length, answers.length),
    }
  })

  const mastery = WORLDS.map((w) => ({
    worldId: w.id,
    skills: skillsInWorld(w.id).map((s) => {
      const m = input.progress[s.id]
      return {
        skillId: s.id,
        title: s.title,
        mastery: m?.mastery ?? 0,
        crowned: m?.crowned ?? false,
        preMastered: m?.preMastered ?? false,
        attempts: input.attempts.filter((a) => a.skillId === s.id).length,
      }
    }),
  }))

  const perSkill = new Map<SkillId, ReportAttempt[]>()
  for (const a of recent) perSkill.set(a.skillId, [...(perSkill.get(a.skillId) ?? []), a])
  const struggling: PracticeItem[] = []
  for (const [skillId, answers] of perSkill) {
    const m = input.progress[skillId]
    if (m?.crowned) continue
    const rate = pct(answers.filter((a) => a.firstTry).length, answers.length)
    const low = answers.length >= STRUGGLE_MIN_ANSWERS && rate !== null && rate < STRUGGLE_PCT
    if (low || (m && m.mastery < 0.5 && answers.length >= STRUGGLE_MIN_ANSWERS)) {
      struggling.push({
        skillId,
        title: getSkill(skillId).title,
        reason: 'struggling',
        firstTryPct: rate,
        mastery: m?.mastery ?? 0,
      })
    }
  }
  struggling.sort((a, b) => (a.firstTryPct ?? 1) - (b.firstTryPct ?? 1) || a.mastery - b.mastery)
  const reviews: PracticeItem[] = Object.entries(input.progress)
    .filter(([, m]) => m && isDue(m, input.now))
    .sort(([, a], [, b]) => (a?.nextReviewAt ?? 0) - (b?.nextReviewAt ?? 0))
    .slice(0, LIST_MAX)
    .map(([skillId, m]) => ({
      skillId,
      title: getSkill(skillId).title,
      reason: 'review' as const,
      firstTryPct: null,
      mastery: m?.mastery ?? 0,
    }))

  const counts = new Map<MisconceptionKey, MistakeCount>()
  for (const a of recent) {
    const inWeek = localDate(a.at) >= weekStart
    for (const key of a.misconceptions.filter(isMathMistake)) {
      const c = counts.get(key) ?? { key, week: 0, fortnight: 0 }
      c.fortnight += 1
      if (inWeek) c.week += 1
      counts.set(key, c)
    }
  }

  const minutes = days.reduce((n, d) => n + d.totalMinutes, 0)
  return {
    totals: {
      missions: input.lessons.filter((l) => l.completed).length,
      minutes,
      answers: recent.length,
      firstTryPct: pct(recent.filter((a) => a.firstTry).length, recent.length),
    },
    days,
    mastery,
    needsPractice: [...struggling.slice(0, LIST_MAX), ...reviews],
    misconceptions: [...counts.values()].sort(
      (a, b) => b.week - a.week || b.fortnight - a.fortnight || a.key.localeCompare(b.key),
    ),
    recentBadges: [...input.badges].sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, LIST_MAX),
  }
}
