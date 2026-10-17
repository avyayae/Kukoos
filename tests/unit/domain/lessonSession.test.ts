import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/domain/curriculum/skills'
import { lessonPlan } from '@/domain/engine/lessonPlan'
import {
  firstTryAccuracy,
  type LessonState,
  lessonMinutes,
  lessonProgress,
  lessonReducer,
  MAX_REQUEUES,
  startLesson,
} from '@/domain/engine/lessonSession'
import { check } from '@/domain/generators/check'
import { correctResponse, wrongResponse } from '@/domain/generators/responses'

const SKILL = 'sub.within100.regroup'
const start = (difficulty: 1 | 2 | 3 | 4 | 5 = 2) =>
  startLesson({ skillId: SKILL, seed: 42, difficulty, at: 0 })

const right = (s: LessonState, at = 1) =>
  lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at })
const wrong = (s: LessonState, at = 1) =>
  lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at })
const next = (s: LessonState, at = 1) => lessonReducer(s, { type: 'continue', at })

describe('lessonPlan', () => {
  it('uses only kinds the skill supports, 10 per lesson', () => {
    for (const skill of SKILLS) {
      const plan = lessonPlan(skill)
      expect(plan).toHaveLength(10)
      for (const p of plan) expect(skill.kinds).toContain(p.kind)
    }
  })

  it('goes blocks → guided column → free column for column skills', () => {
    const plan = lessonPlan(SKILLS.find((s) => s.id === SKILL) as (typeof SKILLS)[number])
    expect(plan.slice(0, 4)).toEqual([
      { kind: 'tradeBlocks', guided: false },
      { kind: 'tradeBlocks', guided: false },
      { kind: 'column', guided: true },
      { kind: 'column', guided: true },
    ])
  })
})

describe('correct/wrong response helpers', () => {
  it('build responses that check() marks correct / wrong for every skill and kind', () => {
    for (const skill of SKILLS) {
      let s = startLesson({ skillId: skill.id, seed: 7, at: 0 })
      while (s.phase !== 'complete') {
        const q = s.question
        expect(check(q, correctResponse(q)).correct, q.id).toBe(true)
        expect(check(q, wrongResponse(q)).correct, q.id).toBe(false)
        s = next(right(s))
      }
    }
  })
})

describe('lessonSession (AC2)', () => {
  it('is deterministic for a seed and the same answers', () => {
    const play = () => {
      let s = start()
      const ids: string[] = []
      while (s.phase !== 'complete') {
        ids.push(s.question.id)
        s = next(s.index % 3 === 0 ? wrong(lessonReducer(wrong(s), { type: 'retry' })) : right(s))
      }
      return ids
    }
    expect(play()).toEqual(play())
  })

  it('a perfect lesson has 10 questions, full accuracy and a 10 combo', () => {
    let s = start()
    let count = 0
    while (s.phase !== 'complete') {
      s = next(right(s), 60_000)
      count++
    }
    expect(count).toBe(10)
    expect(firstTryAccuracy(s)).toBe(1)
    expect(s.bestCombo).toBe(10)
    expect(lessonProgress(s)).toBe(1)
    expect(lessonMinutes(s)).toBe(1)
  })

  it('climbs the staircase after 2 first-try corrects and caps at 5', () => {
    let s = start(4)
    s = next(right(s))
    expect(s.difficulty).toBe(4)
    s = next(right(s))
    expect(s.difficulty).toBe(5)
    s = next(right(next(right(s))))
    expect(s.difficulty).toBe(5)
  })

  it('steps down once per question on the first miss and floors at 1', () => {
    let s = start(2)
    s = wrong(s)
    expect(s.phase).toBe('notYet')
    expect(s.difficulty).toBe(1)
    s = lessonReducer(s, { type: 'retry' })
    s = wrong(s)
    expect(s.difficulty).toBe(1)
  })

  it('first miss → notYet; retry → answering; correct after a miss is not first-try', () => {
    let s = wrong(start())
    expect(s.phase).toBe('notYet')
    expect(s.combo).toBe(0)
    expect(s.wrongResponses).toHaveLength(1)
    s = lessonReducer(s, { type: 'retry' })
    expect(s.phase).toBe('answering')
    s = right(s)
    expect(s.phase).toBe('correct')
    expect(s.results.at(-1)).toMatchObject({ firstTry: false, solved: true, attempts: 2 })
  })

  it('second miss → solution, re-queued once at the end with the same question', () => {
    let s = start()
    const missedId = s.question.id
    s = wrong(lessonReducer(wrong(s), { type: 'retry' }))
    expect(s.phase).toBe('solution')
    expect(s.results.at(-1)).toMatchObject({ solved: false, attempts: 2 })
    s = next(s)
    expect(s.plan).toHaveLength(11)
    while (s.index < 10) s = next(right(s))
    expect(s.question.id).toBe(missedId)
    // missing the re-queued question again does not re-queue it a second time
    s = next(wrong(lessonReducer(wrong(s), { type: 'retry' })))
    expect(s.phase).toBe('complete')
    expect(s.results).toHaveLength(11)
  })

  it(`re-queues at most ${MAX_REQUEUES} questions (lesson ≤ 12)`, () => {
    let s = start()
    while (s.phase !== 'complete') {
      s = next(wrong(lessonReducer(wrong(s), { type: 'retry' })))
    }
    expect(s.plan).toHaveLength(12)
    expect(s.results).toHaveLength(12)
    expect(firstTryAccuracy(s)).toBe(0)
  })

  it('records diagnosed misconceptions on the result', () => {
    let s = startLesson({ skillId: SKILL, seed: 3, at: 0 })
    const m = s.question.arithmetic as NonNullable<LessonState['question']['arithmetic']>
    const smaller = Number(
      String(Math.abs(Math.floor(m.a / 10) - Math.floor(m.b / 10))) +
        String(Math.abs((m.a % 10) - (m.b % 10))),
    )
    s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question, smaller), at: 1 })
    expect(s.lastCheck?.misconception).toBe('sub.smallerFromLarger')
    s = right(lessonReducer(s, { type: 'retry' }))
    expect(s.results.at(-1)?.misconceptions).toEqual(['sub.smallerFromLarger'])
  })

  it('ignores events that do not fit the phase', () => {
    const s = start()
    expect(lessonReducer(s, { type: 'retry' })).toBe(s)
    expect(next(s)).toBe(s)
    const done = right(s)
    expect(right(done)).toBe(done)
  })

  it('reports progress as questions finish', () => {
    let s = start()
    expect(lessonProgress(s)).toBe(0)
    s = right(s)
    expect(lessonProgress(s)).toBeCloseTo(0.1)
    expect(firstTryAccuracy(start())).toBe(0)
  })
})
