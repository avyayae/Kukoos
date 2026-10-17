import { describe, expect, it } from 'vitest'
import { formatMessage, guidedSteps, hintFor, solutionFor } from '@/domain/engine/hintText'
import type { Question } from '@/domain/types'

const q = (
  a: number,
  b: number,
  op: '+' | '-',
  kind: 'column' | 'numeric' = 'numeric',
): Question => ({
  id: 't',
  skillId: 'sub.within100.regroup',
  difficulty: 2,
  kind,
  seed: 0,
  prompt: { text: '', speech: '' },
  payload:
    kind === 'column'
      ? { kind: 'column', a, b, op, columns: 3 }
      : {
          kind: 'numeric',
          display: { type: 'equation', equation: { terms: [a, b], ops: [op], result: null } },
        },
  answer: { type: 'number', value: op === '+' ? a + b : a - b },
  hints: [{ type: 'visual', visual: 'baseTen' }],
  arithmetic: { a, b, op, unknown: 'result' },
})

describe('formatMessage', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(formatMessage('Take {b} from {a}', { a: 6, b: 8 })).toBe('Take 8 from 6')
    expect(formatMessage('Hi {name}', {})).toBe('Hi {name}')
  })
})

describe('hintFor (targeted hints)', () => {
  it('uses the borrowing column for smaller-from-larger (36 − 28 → "take 8 from 6")', () => {
    expect(
      hintFor(q(36, 28, '-'), { correct: false, misconception: 'sub.smallerFromLarger' }),
    ).toEqual({ key: 'misconception:sub.smallerFromLarger', params: { a: 6, b: 8 } })
  })

  it('uses the carrying column for forgot-carry (47 + 38 → "15 is more than 9")', () => {
    expect(hintFor(q(47, 38, '+'), { correct: false, misconception: 'add.forgotCarry' })).toEqual({
      key: 'misconception:add.forgotCarry',
      params: { x: 15 },
    })
  })

  it('passes other misconceptions through without params', () => {
    expect(
      hintFor(q(403, 178, '-'), { correct: false, misconception: 'sub.acrossZeroSkip' }).key,
    ).toBe('misconception:sub.acrossZeroSkip')
  })

  it('falls back to the skill text hint, then the column hint, then the default', () => {
    const withText = {
      ...q(36, 28, '-'),
      hints: [{ type: 'text', key: 'pv.compare.startWithHundreds' }],
    }
    expect(hintFor(withText as Question, { correct: false }).key).toBe(
      'hint:pv.compare.startWithHundreds',
    )
    expect(hintFor(q(36, 28, '-'), null).key).toBe('hint:column')
    const plain = { ...q(36, 28, '-') }
    delete plain.arithmetic
    expect(hintFor(plain, null).key).toBe('hint:default')
  })

  it('falls back when a targeted hint has no column to point at', () => {
    // A forgot-carry diagnosis on a problem with no carry can't name a column.
    expect(hintFor(q(32, 41, '+'), { correct: false, misconception: 'add.forgotCarry' }).key).toBe(
      'hint:column',
    )
  })
})

describe('solutionFor', () => {
  it('states the answer', () => {
    expect(solutionFor(q(36, 28, '-'))).toEqual({ key: 'solution:answer', params: { answer: '8' } })
    const tf = { ...q(1, 1, '+'), answer: { type: 'boolean', value: false } } as Question
    expect(solutionFor(tf).params.answer).toBe('false')
  })
})

describe('guidedSteps', () => {
  it('walks 403 − 178 column by column', () => {
    expect(guidedSteps(q(403, 178, '-', 'column'))).toEqual([
      { key: 'guided:sub.tradeAcrossZero', params: { place: 'Ones', a: 3, b: 8 } },
      { key: 'guided:sub.ready', params: { place: 'Tens', a: 9, b: 7 } },
      { key: 'guided:sub.ready', params: { place: 'Hundreds', a: 3, b: 1 } },
    ])
  })

  it('says when to trade for 652 − 318 and when to carry for 47 + 38', () => {
    expect(guidedSteps(q(652, 318, '-', 'column'))[0]).toEqual({
      key: 'guided:sub.trade',
      params: { place: 'Ones', a: 2, b: 8 },
    })
    expect(guidedSteps(q(47, 38, '+', 'column'))).toEqual([
      { key: 'guided:add.carry', params: { place: 'Ones', a: 7, b: 8, plus: '' } },
      { key: 'guided:add', params: { place: 'Tens', a: 4, b: 3, plus: ' + 1' } },
    ])
  })

  it('returns nothing for non-column questions', () => {
    expect(guidedSteps(q(1, 2, '+'))).toEqual([])
  })
})
