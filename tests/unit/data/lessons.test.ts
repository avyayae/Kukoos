import { describe, expect, it } from 'vitest'
import { lessonToRows } from '@/data/mappers'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { newId } from '@/data/write'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  simulateBugs,
  startLesson,
  wrongResponse,
} from '@/domain'
import { freshDb } from './testDb'

const SKILL = 'sub.within100.regroup'

/** Plays a lesson: misses the first question twice (smaller-from-larger), the rest right. */
function playLesson(questions = Infinity): LessonState {
  let s = startLesson({ skillId: SKILL, seed: 42, at: 1_000 })
  let at = 1_000
  let answered = 0
  while (s.phase !== 'complete' && answered < questions) {
    at += 10_000
    if (answered === 0) {
      const m = s.question.arithmetic as NonNullable<LessonState['question']['arithmetic']>
      const bug = simulateBugs(m.a, m.b, m.op)['sub.smallerFromLarger'] as number
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question, bug), at })
      s = lessonReducer(s, { type: 'retry' })
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at })
    } else {
      s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at })
    }
    answered++
    if (answered < questions) s = lessonReducer(s, { type: 'continue', at })
  }
  return s
}

describe('lessonToRows', () => {
  it('derives lesson totals and one attempt per question result', () => {
    const state = playLesson()
    const { lesson, attempts } = lessonToRows(state, { lessonId: 'L1', profileId: 'P1' }, 999_999)
    expect(lesson).toMatchObject({
      id: 'L1',
      profileId: 'P1',
      skillId: SKILL,
      seed: 42,
      completed: true,
      questionCount: state.results.length,
      firstTryCorrect: state.results.filter((r) => r.firstTry).length,
      durationMs: (state.endedAt ?? 0) - 1_000,
    })
    expect(lesson.questionCount).toBe(11) // first question re-queued once
    expect(attempts).toHaveLength(11)
    expect(attempts[0]).toMatchObject({
      lessonId: 'L1',
      solved: false,
      attempts: 2,
      // 1st miss: the bug answer; 2nd miss: answer + 1
      misconceptions: ['sub.smallerFromLarger', 'offByOne'],
    })
    expect(attempts[0]?.at).toBe(11_000)
  })
})

describe('lessons repository (AC3–AC6)', () => {
  it('saves a completed lesson with attempts and outbox entries in one go', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => 2_000_000)
    const state = playLesson()
    const lessonId = newId()
    await repos.lessons.save(state, { lessonId, profileId: 'P1' })
    expect(await db.lessons.count()).toBe(1)
    expect(await db.attempts.where('lessonId').equals(lessonId).count()).toBe(11)
    // lesson + 11 attempts + 1 skill-progress row (F006) + wallet + First Flight badge (F008)
    expect(await db.outbox.count()).toBe(15)
    const lesson = await db.lessons.get(lessonId)
    expect(lesson).toMatchObject({ updatedAt: 2_000_000, version: 1, completed: true })
    const attempt = await db.attempts.where('lessonId').equals(lessonId).first()
    expect(attempt?.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(attempt).toMatchObject({ profileId: 'P1', version: 1 })
  })

  it('is idempotent: saving the same lesson twice changes nothing', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    const state = playLesson()
    const meta = { lessonId: newId(), profileId: 'P1' }
    await repos.lessons.save(state, meta)
    await repos.lessons.save(state, meta)
    expect(await db.lessons.count()).toBe(1)
    expect(await db.attempts.count()).toBe(11)
    // lesson + 11 attempts + 1 skill-progress row (F006) + wallet + First Flight badge (F008)
    expect(await db.outbox.count()).toBe(15)
  })

  it('saves an early exit as incomplete, and nothing when no question was answered', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    await repos.lessons.save(playLesson(3), { lessonId: 'partial', profileId: 'P1' })
    expect(await db.lessons.get('partial')).toMatchObject({ completed: false, questionCount: 3 })
    await repos.lessons.save(startLesson({ skillId: SKILL, seed: 1, at: 0 }), {
      lessonId: 'empty',
      profileId: 'P1',
    })
    expect(await db.lessons.get('empty')).toBeUndefined()
  })

  it('reports the best first-try score of completed lessons per skill, per profile', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    const state = playLesson()
    await repos.lessons.save(state, { lessonId: 'a', profileId: 'P1' })
    await repos.lessons.save(playLesson(3), { lessonId: 'b', profileId: 'P1' }) // incomplete: ignored
    const perfect = (() => {
      let s = startLesson({ skillId: 'add.within20', seed: 3, at: 0 })
      while (s.phase !== 'complete') {
        s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
        s = lessonReducer(s, { type: 'continue', at: 1 })
      }
      return s
    })()
    await repos.lessons.save(perfect, { lessonId: 'c', profileId: 'P1' })
    await repos.lessons.save(perfect, { lessonId: 'd', profileId: 'P2' })
    expect(await repos.lessons.bestFirstTryBySkill('P1')).toEqual({
      [SKILL]: Math.round((10 / 11) * 100),
      'add.within20': 100,
    })
    expect(await repos.lessons.bestFirstTryBySkill('nobody')).toEqual({})
  })
})
