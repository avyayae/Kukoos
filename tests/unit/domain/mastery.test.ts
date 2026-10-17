import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  alphaFor,
  answerScore,
  applyAnswer,
  applyLesson,
  crownedAfter,
  DAY_MS,
  isDue,
  newMastery,
  nextBox,
  type SkillMastery,
} from '@/domain/engine/mastery'
import type { Difficulty } from '@/domain/types'

const right = (difficulty: Difficulty = 3) => ({ firstTry: true, solved: true, difficulty })
const afterRetry = (difficulty: Difficulty = 3) => ({ firstTry: false, solved: true, difficulty })
const unsolved = (difficulty: Difficulty = 3) => ({ firstTry: false, solved: false, difficulty })
const at = (m: Partial<SkillMastery>): SkillMastery => ({ ...newMastery(), ...m })

describe('mastery update (AC1)', () => {
  it('scores first-try 1, after-retry 0.5, unsolved 0', () => {
    expect(answerScore(right())).toBe(1)
    expect(answerScore(afterRetry())).toBe(0.5)
    expect(answerScore(unsolved())).toBe(0)
  })

  it.each([
    [1, 0.135],
    [2, 0.15],
    [3, 0.165],
    [4, 0.18],
    [5, 0.195],
  ] as const)('difficulty %i → alpha %f', (d, alpha) => {
    expect(alphaFor(d)).toBeCloseTo(alpha, 10)
  })

  it('moves mastery toward the score by alpha', () => {
    expect(applyAnswer(newMastery(), right(2)).mastery).toBeCloseTo(0.15)
    expect(applyAnswer(at({ mastery: 0.5 }), afterRetry(2)).mastery).toBeCloseTo(0.5)
    expect(applyAnswer(at({ mastery: 0.5 }), unsolved(2)).mastery).toBeCloseTo(0.425)
    expect(applyAnswer(newMastery(), right()).attempts).toBe(1)
  })

  it('always stays within [0, 1]', () => {
    const outcome = fc.record({
      firstTry: fc.boolean(),
      solved: fc.boolean(),
      difficulty: fc.constantFrom<Difficulty>(1, 2, 3, 4, 5),
    })
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.array(outcome, { maxLength: 60 }),
        (m, os) => {
          const result = os.reduce(applyAnswer, at({ mastery: m }))
          expect(result.mastery).toBeGreaterThanOrEqual(0)
          expect(result.mastery).toBeLessThanOrEqual(1)
        },
      ),
    )
  })
})

describe('crowns (AC1)', () => {
  it('needs 0.85 mastery, 15 attempts and 2 sessions', () => {
    expect(crownedAfter(at({ mastery: 0.9, attempts: 15, sessionsSeen: 2 }))).toBe(true)
    expect(crownedAfter(at({ mastery: 0.84, attempts: 30, sessionsSeen: 3 }))).toBe(false)
    expect(crownedAfter(at({ mastery: 0.95, attempts: 14, sessionsSeen: 3 }))).toBe(false)
    expect(crownedAfter(at({ mastery: 0.95, attempts: 30, sessionsSeen: 1 }))).toBe(false)
  })

  it('keeps the crown until mastery drops below 0.70', () => {
    expect(crownedAfter(at({ crowned: true, mastery: 0.7 }))).toBe(true)
    expect(crownedAfter(at({ crowned: true, mastery: 0.69 }))).toBe(false)
  })

  it('one perfect lesson is never enough; two strong lessons are', () => {
    const ten = Array.from({ length: 10 }, () => right(3))
    const once = applyLesson(undefined, ten, 0)
    expect(once.crowned).toBe(false)
    let m = once
    for (let i = 0; i < 6 && !m.crowned; i++) m = applyLesson(m, ten, i * DAY_MS)
    expect(m.crowned).toBe(true)
    expect(m.sessionsSeen).toBeGreaterThanOrEqual(2)
  })

  it('losing the crown clears the pre-mastered flag', () => {
    const pre = at({
      mastery: 0.72,
      crowned: true,
      preMastered: true,
      attempts: 20,
      sessionsSeen: 3,
    })
    const after = applyLesson(
      pre,
      Array.from({ length: 5 }, () => unsolved()),
      0,
    )
    expect(after.crowned).toBe(false)
    expect(after.preMastered).toBe(false)
  })
})

describe('spaced review (AC2)', () => {
  it.each([
    [1, true, 2],
    [4, true, 5],
    [5, true, 5],
    [3, false, 1],
  ] as const)('box %i, passed=%s → box %i', (box, passed, expected) => {
    expect(nextBox(box, passed)).toBe(expected)
  })

  it('schedules the next review by the box interval (1, 2, 4, 7, 14 days)', () => {
    const t0 = 1_000_000
    const passed = applyLesson(
      at({ srsBox: 2 }),
      Array.from({ length: 5 }, () => right()),
      t0,
    )
    expect(passed.srsBox).toBe(3)
    expect(passed.nextReviewAt).toBe(t0 + 4 * DAY_MS)
    const failed = applyLesson(
      at({ srsBox: 4 }),
      [right(), right(), right(), unsolved(), unsolved()],
      t0,
    )
    expect(failed.srsBox).toBe(1)
    expect(failed.nextReviewAt).toBe(t0 + DAY_MS)
  })

  it('80% first-try accuracy passes the review (boundary)', () => {
    const fourOfFive = [right(), right(), right(), right(), afterRetry()]
    expect(applyLesson(at({ srsBox: 1 }), fourOfFive, 0).srsBox).toBe(2)
  })

  it('only crowned skills are due, exactly at the review time', () => {
    expect(isDue(at({ crowned: true, nextReviewAt: 100 }), 99)).toBe(false)
    expect(isDue(at({ crowned: true, nextReviewAt: 100 }), 100)).toBe(true)
    expect(isDue(at({ crowned: false, nextReviewAt: 0 }), 100)).toBe(false)
    expect(isDue(undefined, 100)).toBe(false)
  })

  it('an empty lesson changes nothing', () => {
    const m = at({ mastery: 0.4 })
    expect(applyLesson(m, [], 5)).toBe(m)
  })
})
