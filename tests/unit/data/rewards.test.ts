import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  localDate,
  startLesson,
  wrongResponse,
} from '@/domain'
import { freshDb } from './testDb'

const DAY = 86_400_000
const T0 = new Date(2026, 9, 17, 18, 0).getTime()

/** A lesson of `add.within20`, missing the first `miss` questions once; optionally unfinished. */
function play(miss = 0, stopAfter = Infinity): LessonState {
  let s = startLesson({ skillId: 'add.within20', seed: 3, at: T0 })
  let i = 0
  while (s.phase !== 'complete' && i < stopAfter) {
    if (i < miss) {
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at: T0 })
      s = lessonReducer(s, { type: 'retry' })
    }
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: T0 })
    s = lessonReducer(s, { type: 'continue', at: T0 + 60_000 })
    i++
  }
  return s
}

function store(start = T0) {
  let at = start
  const repos = createDexieRepositories(freshDb(), () => at)
  return { repos, setNow: (ms: number) => (at = ms) }
}

describe('lesson rewards (AC7, AC9)', () => {
  it('a first perfect lesson earns XP, a chest, crystals and First Flight — once', async () => {
    const { repos } = store()
    const effects = await repos.lessons.save(play(), { lessonId: 'L1', profileId: 'P1' })
    expect(effects.map((e) => e.type)).toEqual([
      'xpGained',
      'chestOpened',
      'gemsGained',
      'badgeUnlocked',
    ])
    const { wallet } = await repos.rewards.wallet('P1')
    expect(wallet).toMatchObject({ gems: 20, level: 1, streakCount: 0 })
    expect(wallet.xpTotal).toBeGreaterThanOrEqual(15)
    expect((await repos.rewards.badges('P1')).map((b) => b.badgeId)).toEqual(['first-flight'])

    // Re-saving the same lesson is a no-op (idempotent rewards).
    expect(await repos.lessons.save(play(), { lessonId: 'L1', profileId: 'P1' })).toEqual([])
    expect((await repos.rewards.wallet('P1')).wallet).toEqual(wallet)
  })

  it('an unfinished lesson earns no XP or crystals', async () => {
    const { repos } = store()
    const effects = await repos.lessons.save(play(0, 3), { lessonId: 'L1', profileId: 'P1' })
    expect(effects).toEqual([])
    expect((await repos.rewards.wallet('P1')).wallet.xpTotal).toBe(0)
  })

  it('meeting the goal marks today and extends the streak once (AC7)', async () => {
    const { repos } = store()
    await repos.time.addActive('P1', 600, 600)
    const effects = await repos.lessons.save(play(1), { lessonId: 'L1', profileId: 'P1' })
    expect(effects).toContainEqual({ type: 'goalMet', minutes: 10 })
    expect(effects).toContainEqual({ type: 'streakExtended', count: 1, milestone: false })
    expect((await repos.time.today('P1')).goalMet).toBe(true)

    // A later tick keeps goalMet; a second lesson today doesn't extend again.
    await repos.time.addActive('P1', 5, 5)
    expect((await repos.time.today('P1')).goalMet).toBe(true)
    const more = await repos.lessons.save(play(1), { lessonId: 'L2', profileId: 'P1' })
    expect(more.some((e) => e.type === 'streakExtended' || e.type === 'goalMet')).toBe(false)
    expect((await repos.rewards.wallet('P1')).wallet.streakCount).toBe(1)
  })

  it('a missed day with no freeze starts a new flame when the wallet loads', async () => {
    const { repos, setNow } = store()
    await repos.time.addActive('P1', 600, 600)
    await repos.lessons.save(play(), { lessonId: 'L1', profileId: 'P1' })
    setNow(T0 + 3 * DAY)
    expect(await repos.rewards.wallet('P1')).toMatchObject({
      roll: { kind: 'reset', lost: 1 },
      wallet: { streakCount: 0 },
    })
    // Settled once.
    expect((await repos.rewards.wallet('P1')).roll.kind).toBe('none')
  })

  it('pre-mastered crowns never award badges (§1.1)', async () => {
    const { repos } = store()
    await repos.progress.applyStartingPoint('P1', 'sub.3digit.acrossZero')
    await repos.lessons.save(play(), { lessonId: 'L1', profileId: 'P1' })
    expect((await repos.rewards.badges('P1')).map((b) => b.badgeId)).toEqual(['first-flight'])
  })
})

describe('daily time (AC6 data, AC12)', () => {
  it('adds active seconds to today and starts fresh tomorrow', async () => {
    const { repos, setNow } = store()
    await repos.time.addActive('P1', 5, 5)
    await repos.time.addActive('P1', 0, 5)
    expect(await repos.time.today('P1')).toEqual({
      date: localDate(T0),
      lessonSeconds: 5,
      totalSeconds: 10,
      bonusMinutes: 0,
      goalMet: false,
    })
    await repos.time.addBonus('P1', 10)
    expect((await repos.time.today('P1')).bonusMinutes).toBe(10)
    setNow(T0 + DAY)
    expect((await repos.time.today('P1')).totalSeconds).toBe(0)
  })

  it('stores goal and limit per profile, with defaults 10 and 60', async () => {
    const { repos } = store()
    expect(await repos.time.settings('P1')).toEqual({ goalMin: 10, limitMin: 60 })
    await repos.time.setSettings('P1', { goalMin: 15, limitMin: null })
    expect(await repos.time.settings('P1')).toEqual({ goalMin: 15, limitMin: null })
    expect(await repos.time.settings('P2')).toEqual({ goalMin: 10, limitMin: 60 })
  })

  it('the null store keeps today in memory', async () => {
    let at = T0
    const repos = createNullRepositories(() => at)
    await repos.time.addActive('x', 5, 5)
    await repos.time.addBonus('x', 10)
    expect(await repos.time.today('x')).toMatchObject({ lessonSeconds: 5, bonusMinutes: 10 })
    await repos.time.setSettings('x', { goalMin: 5, limitMin: 15 })
    expect(await repos.time.settings('x')).toEqual({ goalMin: 5, limitMin: 15 })
    at = T0 + DAY
    expect((await repos.time.today('x')).totalSeconds).toBe(0)
    expect(await repos.lessons.save(play(), { lessonId: 'L', profileId: 'x' })).toEqual([])
    expect((await repos.rewards.wallet('x')).wallet.xpTotal).toBe(0)
    expect(await repos.rewards.badges('x')).toEqual([])
  })
})
