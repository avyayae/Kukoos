import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  detectMisconception,
  detectSlip,
  MISCONCEPTION_PRIORITY,
  simulateBugs,
} from '@/domain/arithmetic/misconceptions'
import type { MisconceptionKey, Op } from '@/domain/types'

describe('misconception catalog examples (AC8)', () => {
  it.each<[number, Op, number, number, MisconceptionKey]>([
    [36, '-', 28, 12, 'sub.smallerFromLarger'],
    [52, '-', 28, 34, 'sub.borrowNoDecrement'],
    [403, '-', 178, 335, 'sub.borrowNoDecrement'],
    [403, '-', 178, 235, 'sub.acrossZeroSkip'],
    [500, '-', 263, 247, 'sub.acrossZeroSkip'],
    [47, '+', 38, 75, 'add.forgotCarry'],
    [47, '+', 38, 715, 'add.wroteWholeSum'],
    [36, '-', 28, 64, 'wrongOperation'],
    [47, '+', 38, 84, 'offByOne'],
    [403, '-', 178, 325, 'offByTen'],
  ])('%i %s %i answered %i → %s', (a, op, b, answer, key) => {
    expect(detectMisconception(a, b, op, answer)).toBe(key)
  })

  it('returns nothing for the correct answer or an unexplained one', () => {
    expect(detectMisconception(36, 28, '-', 8)).toBeUndefined()
    expect(detectMisconception(36, 28, '-', 50)).toBeUndefined()
  })

  it('prefers algorithmic bugs over off-by-ten when both match (235 for 403 − 178)', () => {
    expect(detectSlip(225, 235)).toBe('offByTen')
    expect(detectMisconception(403, 178, '-', 235)).toBe('sub.acrossZeroSkip')
  })

  it('resolves bug collisions by priority (52 − 27: both bugs give 35)', () => {
    const bugs = simulateBugs(52, 27, '-')
    expect(bugs['sub.smallerFromLarger']).toBe(35)
    expect(bugs['sub.borrowNoDecrement']).toBe(35)
    expect(detectMisconception(52, 27, '-', 35)).toBe('sub.smallerFromLarger')
  })

  it('lists generic slips last', () => {
    expect(MISCONCEPTION_PRIORITY.slice(-2)).toEqual(['offByOne', 'offByTen'])
  })
})

describe('simulateBugs', () => {
  it('omits bugs that would give the correct answer (no regrouping → no regroup bugs)', () => {
    expect(simulateBugs(587, 243, '-')).toEqual({ wrongOperation: 830 })
    expect(simulateBugs(324, 152, '+')).toEqual({ wrongOperation: 172 })
  })

  it('only simulates across-zero when a zero is borrowed across', () => {
    expect(simulateBugs(652, 318, '-')['sub.acrossZeroSkip']).toBeUndefined()
    expect(simulateBugs(403, 178, '-')['sub.acrossZeroSkip']).toBe(235)
  })

  it('never returns the correct answer and every bug is detected as itself or a higher-priority key', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), fc.integer({ min: 0, max: 999 }), (x, y) => {
        const [a, b] = x >= y ? [x, y] : [y, x]
        const ops: Op[] = a + b <= 999 ? ['+', '-'] : ['-']
        for (const op of ops) {
          const correct = op === '+' ? a + b : a - b
          const bugs = simulateBugs(a, b, op)
          for (const [key, value] of Object.entries(bugs)) {
            expect(value).not.toBe(correct)
            expect(value).toBeGreaterThanOrEqual(0)
            const detected = detectMisconception(a, b, op, value) as MisconceptionKey
            expect(MISCONCEPTION_PRIORITY.indexOf(detected)).toBeLessThanOrEqual(
              MISCONCEPTION_PRIORITY.indexOf(key as MisconceptionKey),
            )
          }
        }
      }),
      { numRuns: 3000 },
    )
  })
})
