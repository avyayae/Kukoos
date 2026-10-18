import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import {
  correctResponse,
  DEFAULT_AVATAR,
  lessonReducer,
  parentReport,
  startLesson,
  wrongResponse,
} from '@/domain'
import { freshDb } from './testDb'

function lessonWithOneMiss() {
  let s = startLesson({ skillId: 'sub.within100.regroup', seed: 4, at: Date.now() })
  let first = true
  while (s.phase !== 'complete') {
    if (first) {
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at: Date.now() })
      s = lessonReducer(s, { type: 'retry' })
      first = false
    }
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: Date.now() })
    s = lessonReducer(s, { type: 'continue', at: Date.now() })
  }
  return s
}

describe('report data (spec 011 AC6)', () => {
  it('feeds the parent report from saved lessons and minutes', async () => {
    const repos = createDexieRepositories(freshDb())
    const id = (await repos.profiles.ensureCurrent())?.id ?? ''
    await repos.lessons.save(lessonWithOneMiss(), { lessonId: 'L1', profileId: id })
    await repos.time.addActive(id, 300, 420)
    const report = parentReport(await repos.reports.forProfile(id))
    expect(report.totals.missions).toBe(1)
    expect(report.totals.minutes).toBe(7)
    expect(report.totals.answers).toBeGreaterThanOrEqual(10)
    expect(report.days.at(-1)?.lessonMinutes).toBe(5)
    expect(report.recentBadges.map((b) => b.badgeId)).toContain('first-flight')
    // Other kids' data stays out.
    const other = await repos.profiles.create({ nickname: 'Leo', grade: 2 })
    expect(parentReport(await repos.reports.forProfile(other?.id ?? '')).totals.answers).toBe(0)
  })

  it('the null store reports nothing', async () => {
    const r = parentReport(await createNullRepositories().reports.forProfile('x'))
    expect(r.totals).toEqual({ missions: 0, minutes: 0, answers: 0, firstTryPct: null })
  })
})

describe('reset progress (spec 011 AC8)', () => {
  it('clears progress but keeps the kid, the explorer and their settings', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    const id = (await repos.profiles.ensureCurrent())?.id ?? ''
    await repos.profiles.update(id, { nickname: 'Nova', avatar: DEFAULT_AVATAR })
    await repos.time.setSettings(id, { goalMin: 15, limitMin: 45 })
    await repos.lessons.save(lessonWithOneMiss(), { lessonId: 'L1', profileId: id })
    await repos.time.addActive(id, 60, 60)

    expect(await repos.profiles.reset(id)).toBe(true)
    for (const table of [
      'lessons',
      'attempts',
      'skillProgress',
      'wallet',
      'badges',
      'dailyActivity',
    ] as const) {
      expect(await db.table(table).count(), table).toBe(0)
    }
    expect((await repos.profiles.list())[0]).toMatchObject({
      nickname: 'Nova',
      avatar: DEFAULT_AVATAR,
    })
    expect(await repos.time.settings(id)).toEqual({ goalMin: 15, limitMin: 45 })
    expect(await repos.profiles.reset('missing')).toBe(false)
    expect(await createNullRepositories().profiles.reset('x')).toBe(false)
  })
})
