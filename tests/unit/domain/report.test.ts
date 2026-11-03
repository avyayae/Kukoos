import { describe, expect, it } from 'vitest'
import { DAY_MS, newMastery, type SkillMastery } from '@/domain/engine/mastery'
import { localDate } from '@/domain/gamification/dates'
import { parentReport, type ParentReportInput, type ReportAttempt } from '@/domain/report'

const NOW = new Date(2026, 9, 18, 19, 0).getTime()
const daysAgo = (n: number, hour = 17) => {
  const d = new Date(NOW - n * DAY_MS)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
}
const attempt = (over: Partial<ReportAttempt> = {}): ReportAttempt => ({
  skillId: 'sub.within100.regroup',
  firstTry: true,
  misconceptions: [],
  at: daysAgo(0),
  ...over,
})
const input = (over: Partial<ParentReportInput> = {}): ParentReportInput => ({
  attempts: [],
  lessons: [],
  days: [],
  progress: {},
  badges: [],
  now: NOW,
  ...over,
})
const m = (over: Partial<SkillMastery>): SkillMastery => ({ ...newMastery(), ...over })

describe('parent report (spec 011 AC6)', () => {
  it('lays out 14 local days ending today, with minutes and first-try %', () => {
    const r = parentReport(
      input({
        attempts: [attempt(), attempt({ firstTry: false }), attempt({ at: daysAgo(2) })],
        days: [
          { date: localDate(NOW), lessonSeconds: 600, totalSeconds: 900 },
          { date: localDate(daysAgo(20)), lessonSeconds: 6000, totalSeconds: 6000 },
        ],
        lessons: [
          { skillId: 'add.within20', completed: true, endedAt: daysAgo(1) },
          { skillId: 'add.within20', completed: false, endedAt: daysAgo(1) },
        ],
      }),
    )
    expect(r.days).toHaveLength(14)
    expect(r.days.at(-1)).toEqual({
      date: localDate(NOW),
      lessonMinutes: 10,
      totalMinutes: 15,
      answers: 2,
      firstTryPct: 0.5,
    })
    expect(r.days.at(-3)?.firstTryPct).toBe(1)
    expect(r.days[0]?.firstTryPct).toBeNull()
    expect(r.totals).toEqual({ missions: 1, minutes: 15, answers: 3, firstTryPct: 2 / 3 })
  })

  it('counts mistake patterns for this week and the last 14 days, most frequent first', () => {
    const r = parentReport(
      input({
        attempts: [
          attempt({ firstTry: false, misconceptions: ['sub.smallerFromLarger'] }),
          attempt({ firstTry: false, misconceptions: ['sub.smallerFromLarger', 'offByOne'] }),
          attempt({ at: daysAgo(10), misconceptions: ['add.forgotCarry'] }),
          attempt({ at: daysAgo(10), misconceptions: ['add.forgotCarry'] }),
          attempt({ at: daysAgo(10), misconceptions: ['add.forgotCarry'] }),
          attempt({ at: daysAgo(30), misconceptions: ['offByTen'] }),
        ],
      }),
    )
    expect(r.misconceptions).toEqual([
      { key: 'sub.smallerFromLarger', week: 2, fortnight: 2 },
      { key: 'offByOne', week: 1, fortnight: 1 },
      { key: 'add.forgotCarry', week: 0, fortnight: 3 },
    ])
  })

  it('needs practice: struggling uncrowned skills worst first, then due reviews', () => {
    const misses = (skillId: string, right: number, wrong: number) => [
      ...Array.from({ length: right }, () => attempt({ skillId })),
      ...Array.from({ length: wrong }, () => attempt({ skillId, firstTry: false })),
    ]
    const r = parentReport(
      input({
        attempts: [
          ...misses('sub.within100.regroup', 1, 4), // 20%
          ...misses('add.within100.regroup', 2, 3), // 40%
          ...misses('add.within20', 9, 1), // fine
          ...misses('sub.within20', 0, 2), // too few answers to judge
        ],
        progress: {
          'sub.within100.regroup': m({ mastery: 0.3 }),
          'add.within100.regroup': m({ mastery: 0.4 }),
          'add.within20': m({ mastery: 0.9, crowned: true, nextReviewAt: NOW - 1 }),
        },
      }),
    )
    expect(r.needsPractice.map((p) => [p.skillId, p.reason])).toEqual([
      ['sub.within100.regroup', 'struggling'],
      ['add.within100.regroup', 'struggling'],
      ['add.within20', 'review'],
    ])
    expect(r.needsPractice[0]?.firstTryPct).toBeCloseTo(0.2)
  })

  it('mastery covers every skill by world; badges newest first', () => {
    const r = parentReport(
      input({
        progress: { 'add.within20': m({ mastery: 1, crowned: true, preMastered: true }) },
        badges: [
          { badgeId: 'first-flight', unlockedAt: 1 },
          { badgeId: 'astronaut', unlockedAt: 5 },
        ],
      }),
    )
    expect(r.mastery.map((w) => w.worldId)).toEqual(['jungle', 'savanna', 'ocean', 'moon', 'mars'])
    expect(r.mastery.flatMap((w) => w.skills)).toHaveLength(23)
    expect(r.mastery[0]?.skills[0]).toMatchObject({
      skillId: 'add.within20',
      crowned: true,
      preMastered: true,
    })
    expect(r.recentBadges.map((b) => b.badgeId)).toEqual(['astronaut', 'first-flight'])
    expect(parentReport(input()).totals.firstTryPct).toBeNull()
  })
})

describe('the report is math-only (spec 016)', () => {
  it('ignores chess lessons, answers, mastery and mistakes, without crashing', () => {
    const r = parentReport(
      input({
        attempts: [
          attempt({ skillId: 'chess.knight', misconceptions: ['chess.not-how-it-moves:n'] }),
          attempt({ skillId: 'chess.knight', firstTry: false }),
          attempt({ misconceptions: ['sub.smallerFromLarger'] }),
        ],
        lessons: [{ skillId: 'chess.knight', completed: true, endedAt: daysAgo(0) }],
        progress: { 'chess.knight': m({ mastery: 0.2, crowned: true, nextReviewAt: 0 }) },
      }),
    )
    expect(r.totals.answers).toBe(1)
    expect(r.totals.missions).toBe(0)
    expect(r.misconceptions.map((x) => x.key)).toEqual(['sub.smallerFromLarger'])
    expect(r.needsPractice.map((p) => p.skillId)).not.toContain('chess.knight')
  })
})
