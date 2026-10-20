import fc from 'fast-check'
import { CHESS_SKILLS } from '@/domain/chess/curriculum'
import { describe, expect, it } from 'vitest'
import { BADGES, type BadgeStats, getBadge, newBadges } from '@/domain/gamification/badges'
import { addDays, daysBetween, localDate } from '@/domain/gamification/dates'
import { lessonRewards, type LessonRewardsInput } from '@/domain/gamification/rewards'
import { meetGoal, NEW_WALLET, rollStreak, type Wallet } from '@/domain/gamification/streak'
import { EMPTY_DAY, timeBudget, WARN_SECONDS } from '@/domain/gamification/timeBudget'
import {
  isPerfect,
  lessonGems,
  lessonXp,
  levelFor,
  type LessonSummary,
  xpForLevel,
} from '@/domain/gamification/xp'

const lesson = (over: Partial<LessonSummary> = {}): LessonSummary => ({
  completed: true,
  mode: 'skill',
  questionCount: 10,
  firstTryCorrect: 10,
  bestCombo: 10,
  bossPassed: false,
  ...over,
})
const wallet = (over: Partial<Wallet> = {}): Wallet => ({ ...NEW_WALLET, ...over })
const dateArb = fc.integer({ min: 0, max: 20_000 }).map((n) => addDays('2020-01-01', n))

describe('dates', () => {
  it('formats the device-local calendar date', () => {
    expect(localDate(new Date(2026, 9, 17, 23, 59).getTime())).toBe('2026-10-17')
    expect(localDate(new Date(2026, 0, 5, 0, 0).getTime())).toBe('2026-01-05')
  })
  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('daysBetween inverts addDays', () => {
    fc.assert(
      fc.property(dateArb, fc.integer({ min: -400, max: 400 }), (d, n) => {
        expect(daysBetween(d, addDays(d, n))).toBe(n)
      }),
    )
  })
})

describe('XP, levels and crystals (AC1, AC2)', () => {
  it('a perfect lesson with combo 10 earns 18 XP and 10 crystals', () => {
    expect(lessonXp(lesson())).toBe(18)
    expect(lessonGems(lesson())).toBe(10)
    expect(isPerfect(lesson())).toBe(true)
  })
  it('caps the combo bonus and adds the boss bonus', () => {
    expect(lessonXp(lesson({ firstTryCorrect: 7, bestCombo: 30 }))).toBe(15)
    expect(
      lessonXp(lesson({ mode: 'boss', firstTryCorrect: 8, bestCombo: 2, bossPassed: true })),
    ).toBe(30)
    expect(lessonGems(lesson({ mode: 'boss', firstTryCorrect: 8, bossPassed: true }))).toBe(15)
  })
  it('unfinished lessons earn nothing', () => {
    expect(lessonXp(lesson({ completed: false }))).toBe(0)
    expect(lessonGems(lesson({ completed: false }))).toBe(0)
    expect(isPerfect(lesson({ questionCount: 0, firstTryCorrect: 0 }))).toBe(false)
  })
  it('levels follow 50, 150, 300, 500', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 150, 300, 500])
    expect(levelFor(0)).toBe(1)
    expect(levelFor(49)).toBe(1)
    expect(levelFor(50)).toBe(2)
    expect(levelFor(499)).toBe(4)
  })
  it('level is monotonic in XP and consistent with its threshold', () => {
    fc.assert(
      fc.property(fc.nat(100_000), fc.nat(1000), (xp, more) => {
        const l = levelFor(xp)
        expect(levelFor(xp + more)).toBeGreaterThanOrEqual(l)
        expect(xpForLevel(l)).toBeLessThanOrEqual(xp)
        expect(xpForLevel(l + 1)).toBeGreaterThan(xp)
      }),
    )
  })
})

describe('streak (AC3, AC4)', () => {
  it('meeting the goal the day after extends the streak, once per date', () => {
    const w = wallet({ streakCount: 4, lastGoalMetDate: '2026-10-16' })
    const first = meetGoal(w, '2026-10-17')
    expect(first.extended).toBe(true)
    expect(first.wallet.streakCount).toBe(5)
    const again = meetGoal(first.wallet, '2026-10-17')
    expect(again.extended).toBe(false)
    expect(again.wallet.streakCount).toBe(5)
  })
  it('a clock moved backwards never awards again', () => {
    const w = wallet({ streakCount: 5, lastGoalMetDate: '2026-10-17' })
    const out = meetGoal(w, '2026-10-15')
    expect(out.extended).toBe(false)
    expect(out.wallet).toEqual(w)
  })
  it('the first goal starts a 1-day streak', () => {
    expect(meetGoal(NEW_WALLET, '2026-10-17').wallet.streakCount).toBe(1)
  })
  it('a missed day uses a freeze and keeps the streak', () => {
    const w = wallet({ streakCount: 6, streakFreezes: 1, lastGoalMetDate: '2026-10-15' })
    const out = rollStreak(w, '2026-10-17')
    expect(out.roll).toEqual({ kind: 'frozen', used: 1 })
    expect(out.wallet).toMatchObject({
      streakCount: 6,
      streakFreezes: 0,
      lastGoalMetDate: '2026-10-16',
    })
    // Idempotent for the same day, and meeting the goal continues the streak.
    expect(rollStreak(out.wallet, '2026-10-17').roll.kind).toBe('none')
    expect(meetGoal(out.wallet, '2026-10-17').wallet.streakCount).toBe(7)
  })
  it('without enough freezes the streak starts over', () => {
    const w = wallet({ streakCount: 6, streakFreezes: 1, lastGoalMetDate: '2026-10-14' })
    const out = rollStreak(w, '2026-10-17')
    expect(out.roll).toEqual({ kind: 'reset', lost: 6 })
    expect(out.wallet.streakCount).toBe(0)
    expect(out.wallet.streakFreezes).toBe(1)
    expect(meetGoal(out.wallet, '2026-10-17').wallet.streakCount).toBe(1)
  })
  it('nothing to settle for yesterday, today or no streak', () => {
    const w = wallet({ streakCount: 3, lastGoalMetDate: '2026-10-16' })
    expect(rollStreak(w, '2026-10-17').roll.kind).toBe('none')
    expect(rollStreak(w, '2026-10-16').roll.kind).toBe('none')
    expect(rollStreak(NEW_WALLET, '2026-10-17').roll.kind).toBe('none')
  })
  it('earns a freeze every 7 days, holding at most 2, and flags milestones', () => {
    let w = NEW_WALLET
    const earnedOn: number[] = []
    const milestones: number[] = []
    for (let day = 0; day < 30; day++) {
      const out = meetGoal(w, addDays('2026-01-01', day))
      if (out.freezeEarned) earnedOn.push(out.wallet.streakCount)
      if (out.milestone) milestones.push(out.milestone)
      w = out.wallet
    }
    expect(earnedOn).toEqual([7, 14])
    expect(w.streakFreezes).toBe(2)
    expect(milestones).toEqual([3, 7, 14, 30])
  })
  it('property: any sequence of days never counts a date twice and freezes stay ≤ 2', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 3 }), { maxLength: 60 }), (steps) => {
        let w = NEW_WALLET
        let day = '2026-01-01'
        const counted = new Set<string>()
        for (const s of steps) {
          day = addDays(day, s)
          const out = meetGoal(w, day)
          if (out.extended) {
            expect(counted.has(day)).toBe(false)
            counted.add(day)
          }
          w = out.wallet
          expect(w.streakFreezes).toBeLessThanOrEqual(2)
          expect(w.streakCount).toBeGreaterThanOrEqual(1)
        }
      }),
    )
  })
})

describe('time budget (AC5)', () => {
  const settings = { goalMin: 10, limitMin: 60 }
  it('fills the goal ring from lesson time only', () => {
    const b = timeBudget({ lessonSeconds: 300, totalSeconds: 900, bonusMinutes: 0 }, settings)
    expect(b.goalProgress).toBe(0.5)
    expect(b.goalMet).toBe(false)
    expect(b.remainingSeconds).toBe(2700)
    expect(timeBudget({ ...EMPTY_DAY, lessonSeconds: 600 }, settings).goalMet).toBe(true)
  })
  it('warns at 2 minutes left and locks at the limit; +10 unlocks', () => {
    expect(timeBudget({ ...EMPTY_DAY, totalSeconds: 3600 - WARN_SECONDS }, settings).warn).toBe(
      true,
    )
    const done = timeBudget({ ...EMPTY_DAY, totalSeconds: 3600 }, settings)
    expect(done).toMatchObject({ locked: true, warn: false, remainingSeconds: 0 })
    const bonus = timeBudget({ ...EMPTY_DAY, totalSeconds: 3600, bonusMinutes: 10 }, settings)
    expect(bonus).toMatchObject({ locked: false, remainingSeconds: 600 })
  })
  it('property: progress ∈ [0,1], limit off never locks, more time never unlocks', () => {
    const day = fc.record({
      lessonSeconds: fc.integer({ min: -10, max: 10_000 }),
      totalSeconds: fc.integer({ min: -10, max: 10_000 }),
      bonusMinutes: fc.integer({ min: 0, max: 60 }),
    })
    const goal = fc.constantFrom(5, 10, 15, 20)
    const limit = fc.constantFrom(15, 20, 30, 45, 60)
    fc.assert(
      fc.property(day, goal, limit, fc.nat(5000), (d, goalMin, limitMin, extra) => {
        const b = timeBudget(d, { goalMin, limitMin })
        expect(b.goalProgress).toBeGreaterThanOrEqual(0)
        expect(b.goalProgress).toBeLessThanOrEqual(1)
        expect(b.warn && b.locked).toBe(false)
        const off = timeBudget(d, { goalMin, limitMin: null })
        expect(off.locked || off.warn).toBe(false)
        expect(off.remainingSeconds).toBeNull()
        if (b.locked) {
          expect(
            timeBudget({ ...d, totalSeconds: d.totalSeconds + extra }, { goalMin, limitMin })
              .locked,
          ).toBe(true)
        }
      }),
    )
  })
})

const stats = (over: Partial<BadgeStats> = {}): BadgeStats => ({
  completedLessons: 0,
  perfectLessons: 0,
  firstTryAnswers: 0,
  crowned: new Set(),
  bossesBeaten: 0,
  streak: 0,
  ...over,
})

describe('badges (AC9)', () => {
  it('ids are unique and every rule is reachable', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
    const all = stats({
      completedLessons: 99,
      perfectLessons: 99,
      firstTryAnswers: 999,
      crowned: new Set([
        'add.within100.regroup',
        'sub.within100.regroup',
        'sub.3digit.acrossZero',
        ...CHESS_SKILLS.map((s) => s.id),
      ]),
      bossesBeaten: 5,
      streak: 30,
    })
    expect(newBadges(all, new Set()).map((b) => b.id)).toEqual(BADGES.map((b) => b.id))
  })
  it('awards each badge once', () => {
    const s = stats({ completedLessons: 1, crowned: new Set(['sub.3digit.acrossZero']) })
    expect(newBadges(s, new Set()).map((b) => b.id)).toEqual(['first-flight', 'zero-hero'])
    expect(newBadges(s, new Set(['first-flight', 'zero-hero']))).toEqual([])
    expect(getBadge('zero-hero')?.name).toBe('Zero Hero')
    expect(getBadge('nope')).toBeUndefined()
  })
  it('thresholds: perfect 5, first-try 100, streak 7, a boss', () => {
    const ids = (s: Partial<BadgeStats>) => newBadges(stats(s), new Set()).map((b) => b.id)
    expect(ids({ perfectLessons: 4, firstTryAnswers: 99, streak: 6 })).toEqual([])
    expect(ids({ perfectLessons: 5, firstTryAnswers: 100, streak: 7, bossesBeaten: 1 })).toEqual([
      'animal-rescuer',
      'perfect-pilot',
      'astronaut',
      'hundred-correct',
    ])
  })
})

describe('lessonRewards pipeline (AC1–AC4, AC9, AC10 order)', () => {
  const base = (over: Partial<LessonRewardsInput> = {}): LessonRewardsInput => ({
    summary: lesson(),
    wallet: NEW_WALLET,
    today: '2026-10-17',
    goalJustMet: false,
    goalMin: 10,
    stats: {
      completedLessons: 1,
      perfectLessons: 1,
      firstTryAnswers: 10,
      crowned: new Set(),
      bossesBeaten: 0,
    },
    ownedBadges: new Set(),
    ...over,
  })

  it('first perfect lesson: xp, chest, gems (with badge crystals), badge — in order', () => {
    const r = lessonRewards(base())
    expect(r.effects.map((e) => e.type)).toEqual([
      'xpGained',
      'chestOpened',
      'gemsGained',
      'badgeUnlocked',
    ])
    expect(r.effects[0]).toEqual({ type: 'xpGained', amount: 18, total: 18 })
    expect(r.effects[2]).toEqual({ type: 'gemsGained', amount: 20, total: 20 })
    expect(r.newBadges).toEqual(['first-flight'])
    expect(r.wallet).toMatchObject({ xpTotal: 18, gems: 20, level: 1 })
  })

  it('crossing 50 XP levels up once; meeting the goal extends the streak', () => {
    const r = lessonRewards(
      base({
        wallet: wallet({ xpTotal: 40, streakCount: 2, lastGoalMetDate: '2026-10-16' }),
        goalJustMet: true,
        ownedBadges: new Set(['first-flight']),
      }),
    )
    expect(r.effects.map((e) => e.type)).toEqual([
      'xpGained',
      'chestOpened',
      'gemsGained',
      'levelUp',
      'goalMet',
      'streakExtended',
    ])
    expect(r.effects).toContainEqual({ type: 'levelUp', level: 2 })
    expect(r.effects).toContainEqual({ type: 'streakExtended', count: 3, milestone: true })
    const again = lessonRewards(base({ wallet: r.wallet, ownedBadges: new Set(['first-flight']) }))
    expect(again.effects.some((e) => e.type === 'levelUp')).toBe(false)
  })

  it('a 7th day earns a freeze and the Astronaut badge', () => {
    const r = lessonRewards(
      base({
        summary: lesson({ firstTryCorrect: 6, bestCombo: 2 }),
        wallet: wallet({ streakCount: 6, lastGoalMetDate: '2026-10-16' }),
        goalJustMet: true,
        ownedBadges: new Set(['first-flight']),
      }),
    )
    expect(r.newBadges).toEqual(['astronaut'])
    expect(r.effects.map((e) => e.type)).toEqual([
      'xpGained',
      'gemsGained',
      'badgeUnlocked',
      'goalMet',
      'streakExtended',
      'freezeEarned',
    ])
  })

  it('reports a freeze used when the lesson crosses into a new day', () => {
    const r = lessonRewards(
      base({ wallet: wallet({ streakCount: 3, streakFreezes: 1, lastGoalMetDate: '2026-10-15' }) }),
    )
    expect(r.effects).toContainEqual({ type: 'streakFrozen', used: 1 })
  })

  it('an unfinished lesson earns no xp or crystals but may still meet the goal', () => {
    const r = lessonRewards(
      base({
        summary: lesson({ completed: false, firstTryCorrect: 3, questionCount: 4 }),
        stats: {
          completedLessons: 0,
          perfectLessons: 0,
          firstTryAnswers: 3,
          crowned: new Set(),
          bossesBeaten: 0,
        },
        goalJustMet: true,
      }),
    )
    expect(r.effects.map((e) => e.type)).toEqual(['goalMet', 'streakExtended'])
    expect(r.wallet).toMatchObject({ xpTotal: 0, gems: 0, streakCount: 1 })
  })
})
