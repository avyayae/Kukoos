import { describe, expect, it } from 'vitest'
import { simulateBugs } from '@/domain/arithmetic/misconceptions'
import { check } from '@/domain/generators/check'
import { generateQuestion } from '@/domain/generators/registry'
import type { Difficulty, Question } from '@/domain/types'

/** First generated question matching a predicate (deterministic search over seeds). */
function questionFor(
  skillId: string,
  kind: Question['kind'],
  difficulty: Difficulty,
  predicate: (q: Question) => boolean,
): Question {
  for (let seed = 0; seed < 5000; seed++) {
    const q = generateQuestion(skillId, { difficulty, kind, seed })
    if (predicate(q)) return q
  }
  throw new Error('no matching question')
}

const columnQ = (a: number, b: number): Question => ({
  id: 'test',
  skillId: 'sub.3digit.acrossZero',
  difficulty: 3,
  kind: 'column',
  seed: 0,
  prompt: { text: '', speech: '' },
  payload: { kind: 'column', a, b, op: '-', columns: 3 },
  answer: { type: 'number', value: a - b },
  hints: [],
  arithmetic: { a, b, op: '-', unknown: 'result' },
})

describe('check: numeric answers (AC8)', () => {
  it('accepts the right answer', () => {
    const q = generateQuestion('sub.within100.regroup', { difficulty: 3, kind: 'numeric', seed: 4 })
    expect(check(q, { kind: 'number', value: q.answer.value as number })).toEqual({ correct: true })
  })

  it('diagnoses simulated bugs on generated questions', () => {
    for (let seed = 0; seed < 200; seed++) {
      const q = generateQuestion('sub.3digit.acrossZero', { difficulty: 3, kind: 'numeric', seed })
      const m = q.arithmetic as NonNullable<Question['arithmetic']>
      const value = simulateBugs(m.a, m.b, m.op)['sub.borrowNoDecrement'] as number
      const result = check(q, { kind: 'number', value })
      expect(result.correct).toBe(false)
      expect(result.misconception).toBeDefined()
    }
  })

  it('gives the across-zero diagnosis for 403 − 178 = 235', () => {
    expect(check(columnQ(403, 178), { kind: 'number', value: 235 })).toEqual({
      correct: false,
      misconception: 'sub.acrossZeroSkip',
    })
  })

  it('leaves unexplained wrong answers undiagnosed', () => {
    expect(check(columnQ(403, 178), { kind: 'number', value: 7 })).toEqual({ correct: false })
  })

  it('only reports off-by slips for missing-number questions (decision 1)', () => {
    const q = questionFor(
      'addsub.3digit.mixed',
      'numeric',
      4,
      (x) => x.arithmetic?.unknown === 'b' && x.arithmetic.op === '-',
    )
    const correct = q.answer.value as number
    expect(check(q, { kind: 'number', value: correct + 10 }).misconception).toBe('offByTen')
    const m = q.arithmetic as NonNullable<Question['arithmetic']>
    // The full-problem bug answer means nothing when the kid is finding b.
    const bug = simulateBugs(m.a, m.b, m.op)['sub.smallerFromLarger']
    if (bug !== undefined && Math.abs(bug - correct) > 100) {
      expect(check(q, { kind: 'number', value: bug }).misconception).toBeUndefined()
    }
  })

  it('diagnoses slips on place-value answers', () => {
    const q = generateQuestion('pv.tradeTens', { difficulty: 2, kind: 'numeric', seed: 3 })
    expect(check(q, { kind: 'number', value: (q.answer.value as number) + 1 })).toEqual({
      correct: false,
      misconception: 'offByOne',
    })
  })
})

describe('check: other response kinds', () => {
  it('maps a choice index to its value', () => {
    const q = generateQuestion('add.within100.regroup', { difficulty: 3, kind: 'mcq', seed: 8 })
    if (q.payload.kind !== 'mcq') throw new Error('expected mcq')
    const right = q.payload.choices.indexOf(q.answer.value as number)
    const wrong = (right + 1) % q.payload.choices.length
    expect(check(q, { kind: 'choice', index: right }).correct).toBe(true)
    expect(check(q, { kind: 'choice', index: wrong }).correct).toBe(false)
    expect(() => check(q, { kind: 'choice', index: 9 })).toThrow(RangeError)
  })

  it('checks comparisons and true/false', () => {
    const cmp = generateQuestion('pv.compare3digit', { difficulty: 3, kind: 'compare', seed: 2 })
    const sign = cmp.answer.value as '<' | '=' | '>'
    expect(check(cmp, { kind: 'comparison', value: sign }).correct).toBe(true)
    expect(check(cmp, { kind: 'comparison', value: sign === '<' ? '>' : '<' }).correct).toBe(false)

    const tf = generateQuestion('add.within20', { difficulty: 2, kind: 'trueFalse', seed: 5 })
    expect(check(tf, { kind: 'boolean', value: tf.answer.value as boolean }).correct).toBe(true)
    expect(check(tf, { kind: 'boolean', value: !(tf.answer.value as boolean) }).correct).toBe(false)
  })

  it('rejects responses that do not fit the question', () => {
    const cmp = generateQuestion('pv.compare3digit', { difficulty: 1, kind: 'compare', seed: 1 })
    expect(() => check(cmp, { kind: 'number', value: 1 })).toThrow(TypeError)
    const num = generateQuestion('add.within20', { difficulty: 1, kind: 'numeric', seed: 1 })
    expect(() => check(num, { kind: 'choice', index: 0 })).toThrow(TypeError)
    expect(() => check(num, { kind: 'boolean', value: true })).toThrow(TypeError)
    expect(() => check(num, { kind: 'columnDigits', digits: [1] })).toThrow(TypeError)
    const tf = generateQuestion('add.within20', { difficulty: 1, kind: 'trueFalse', seed: 1 })
    expect(() => check(tf, { kind: 'number', value: 1 })).toThrow(TypeError)
  })
})

describe('check: column digit responses (AC10)', () => {
  it('accepts the right digits (ones first)', () => {
    expect(check(columnQ(403, 178), { kind: 'columnDigits', digits: [5, 2, 2] })).toEqual({
      correct: true,
    })
  })

  it('reports the wrong column plus the misconception', () => {
    expect(check(columnQ(403, 178), { kind: 'columnDigits', digits: [5, 3, 2] })).toEqual({
      correct: false,
      misconception: 'sub.acrossZeroSkip',
      stepErrors: [{ column: 1, expected: 2, got: 3 }],
    })
  })

  it('allows empty leading cells but not empty significant ones', () => {
    expect(check(columnQ(352, 348), { kind: 'columnDigits', digits: [4, null, null] })).toEqual({
      correct: true,
    })
    const result = check(columnQ(403, 178), { kind: 'columnDigits', digits: [5, null, 2] })
    expect(result.correct).toBe(false)
    expect(result.stepErrors).toEqual([{ column: 1, expected: 2, got: null }])
  })

  it('rejects digits outside 0–9', () => {
    expect(() => check(columnQ(403, 178), { kind: 'columnDigits', digits: [12] })).toThrow(
      RangeError,
    )
  })
})
