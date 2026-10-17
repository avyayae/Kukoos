import { describe, expect, it } from 'vitest'
import { progressId } from '@/data/progress'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import {
  composeLesson,
  correctResponse,
  DAY_MS,
  type LessonState,
  lessonReducer,
  newMastery,
  startLesson,
  wrongResponse,
} from '@/domain'
import { freshDb } from './testDb'

const NOW = 30 * DAY_MS

function play(start: LessonState, miss: (i: number) => boolean = () => false): LessonState {
  let s = start
  let i = 0
  while (s.phase !== 'complete') {
    if (miss(i)) {
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at: NOW })
      s = lessonReducer(s, { type: 'retry' })
    }
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: NOW })
    s = lessonReducer(s, { type: 'continue', at: NOW })
    i++
  }
  return s
}

describe('progress saved with the lesson (AC7)', () => {
  it('updates every skill in the lesson, in the same save', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    const progress = {
      'add.within20': { ...newMastery(), mastery: 0.9, crowned: true, nextReviewAt: NOW - DAY_MS },
    }
    const { plan } = composeLesson({ focusSkillId: 'sub.within20', progress, now: NOW, seed: 2 })
    const s = play(startLesson({ skillId: 'sub.within20', seed: 2, at: NOW, plan }))
    await repos.lessons.save(s, { lessonId: 'L1', profileId: 'P1' })

    const rows = await db.skillProgress.toArray()
    expect(rows.map((r) => r.skillId).sort()).toEqual(['add.within20', 'sub.within20'])
    const focus = await db.skillProgress.get(progressId('P1', 'sub.within20'))
    expect(focus).toMatchObject({
      profileId: 'P1',
      attempts: s.results.filter((r) => r.skillId === 'sub.within20').length,
      sessionsSeen: 1,
      srsBox: 2,
      nextReviewAt: NOW + 2 * DAY_MS,
      crowned: false,
      version: 1,
    })
    expect(focus?.mastery).toBeGreaterThan(0)
    // lesson + attempts + 2 progress rows, each with an outbox entry
    expect(await db.outbox.count()).toBe(1 + s.results.length + 2)
  })

  it('re-saving the same lesson does not double-count', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    const s = play(startLesson({ skillId: 'add.within20', seed: 1, at: NOW }))
    await repos.lessons.save(s, { lessonId: 'L1', profileId: 'P1' })
    await repos.lessons.save(s, { lessonId: 'L1', profileId: 'P1' })
    expect((await db.skillProgress.get(progressId('P1', 'add.within20')))?.sessionsSeen).toBe(1)
  })

  it('crowns a skill after enough strong lessons, and progress reads back per profile', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    for (let i = 0; i < 5; i++) {
      const s = play(startLesson({ skillId: 'add.within20', seed: i, at: NOW, difficulty: 4 }))
      await repos.lessons.save(s, { lessonId: `L${i}`, profileId: 'P1' })
    }
    const p1 = await repos.progress.forProfile('P1')
    expect(p1['add.within20']?.crowned).toBe(true)
    expect(await repos.progress.forProfile('P2')).toEqual({})
  })

  it('review missions do not count as a skill’s best score', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    const s = play(startLesson({ skillId: 'add.within20', seed: 1, at: NOW, mode: 'review' }))
    await repos.lessons.save(s, { lessonId: 'R1', profileId: 'P1' })
    expect(await repos.lessons.bestFirstTryBySkill('P1')).toEqual({})
    expect((await db.lessons.get('R1'))?.mode).toBe('review')
  })
})

describe('starting point (AC8)', () => {
  it('pre-masters exactly the prerequisites, once, without lowering progress', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    expect(await repos.progress.applyStartingPoint('P1', 'pv.tradeTens')).toBe(4)
    const p = await repos.progress.forProfile('P1')
    expect(Object.keys(p).sort()).toEqual([
      'add.within100.noregroup',
      'add.within20',
      'sub.within100.noregroup',
      'sub.within20',
    ])
    expect(p['add.within20']).toMatchObject({
      mastery: 0.9,
      crowned: true,
      preMastered: true,
      srsBox: 3,
    })
    expect(await repos.progress.applyStartingPoint('P1', 'pv.tradeTens')).toBe(0)
    expect(await repos.progress.applyStartingPoint('P1', 'add.within20')).toBe(0)
  })

  it('the null store has no progress', async () => {
    const repos = createNullRepositories()
    expect(await repos.progress.forProfile('x')).toEqual({})
    expect(await repos.progress.applyStartingPoint('x', 'pv.tradeTens')).toBe(0)
  })
})

describe('back-compat (AC12)', () => {
  it('imports an F004-era backup (lessons without mode, no progress rows)', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => NOW)
    const s = play(startLesson({ skillId: 'add.within20', seed: 1, at: NOW }))
    await repos.lessons.save(s, { lessonId: 'L1', profileId: 'P1' })
    const file = await repos.backup.export()
    const old = {
      ...file,
      tables: {
        ...file.tables,
        lessons: file.tables.lessons.map((l) => {
          const copy = { ...l }
          delete copy.mode
          return copy
        }),
        skillProgress: [],
      },
    }
    const target = createDexieRepositories(freshDb(), () => NOW)
    expect((await target.backup.import(old)).ok).toBe(true)
    expect(await target.lessons.bestFirstTryBySkill('P1')).toEqual({ 'add.within20': 100 })
    expect(await target.progress.forProfile('P1')).toEqual({})
  })
})
