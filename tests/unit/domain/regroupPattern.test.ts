import { describe, expect, it } from 'vitest'
import { digitCount, toDigits } from '@/domain/arithmetic/digits'
import { regroupPattern } from '@/domain/arithmetic/regroupPattern'
import { expectedBWidth, sampleOperands } from '@/domain/arithmetic/sampleOperands'
import { createRng } from '@/domain/rng'
import { DIFFICULTIES, type Op, type RegroupPattern } from '@/domain/types'

describe('regroupPattern (AC4)', () => {
  it.each<[number, Op, number, RegroupPattern]>([
    [324, '+', 152, 'add.none'],
    [348, '+', 237, 'add.carryOnes'],
    [362, '+', 175, 'add.carryTens'],
    [478, '+', 356, 'add.carryBoth'],
    [47, '+', 38, 'add.carryOnes'],
    [587, '-', 243, 'sub.none'],
    [652, '-', 318, 'sub.borrowTens'],
    [36, '-', 28, 'sub.borrowTens'],
    [528, '-', 263, 'sub.borrowHundreds'],
    [723, '-', 458, 'sub.borrowBoth'],
    [403, '-', 178, 'sub.acrossZero'],
    [500, '-', 263, 'sub.acrossZero'],
  ])('%i %s %i → %s', (a, op, b, pattern) => {
    expect(regroupPattern(a, b, op)).toBe(pattern)
  })
})

const CASES: [RegroupPattern, 2 | 3][] = [
  ['add.none', 2],
  ['add.carryOnes', 2],
  ['sub.none', 2],
  ['sub.borrowTens', 2],
  ['add.none', 3],
  ['add.carryOnes', 3],
  ['add.carryTens', 3],
  ['add.carryBoth', 3],
  ['sub.none', 3],
  ['sub.borrowTens', 3],
  ['sub.borrowHundreds', 3],
  ['sub.borrowBoth', 3],
  ['sub.acrossZero', 3],
]

describe('sampleOperands (AC4, AC7)', () => {
  for (const [pattern, digits] of CASES) {
    for (const d of DIFFICULTIES) {
      it(`${pattern} ${digits}-digit d${d}: classifies back to its pattern`, () => {
        for (let seed = 0; seed < 1000; seed++) {
          const { a, b } = sampleOperands(pattern, digits, d, createRng(seed))
          const op: Op = pattern.startsWith('add.') ? '+' : '-'
          expect(regroupPattern(a, b, op), `${a} ${op} ${b}`).toBe(pattern)
          expect(digitCount(a)).toBe(digits)
          expect(digitCount(b)).toBe(expectedBWidth(digits, d))
          if (op === '+') expect(a + b).toBeLessThan(10 ** digits)
          else expect(a).toBeGreaterThan(b)
          if (d <= 3) {
            // no zeros except the across-zero tens digit
            const aZeros = toDigits(a).filter(
              (x, i) => x === 0 && !(pattern === 'sub.acrossZero' && i === 1),
            )
            expect(aZeros, `${a}`).toEqual([])
            expect(toDigits(b)).not.toContain(0)
          }
        }
      })
    }
  }

  it('keeps regrouping columns near at difficulty 1 (e.g. 6 + 5, not 9 + 9)', () => {
    for (let seed = 0; seed < 500; seed++) {
      const { a, b } = sampleOperands('add.carryOnes', 2, 1, createRng(seed))
      expect((a % 10) + (b % 10)).toBeLessThanOrEqual(13)
    }
  })

  it('produces both 403-style and 500-style across-zero problems at difficulty 4', () => {
    const onesZero = new Set<boolean>()
    for (let seed = 0; seed < 200; seed++) {
      const { a } = sampleOperands('sub.acrossZero', 3, 4, createRng(seed))
      onesZero.add(a % 10 === 0)
    }
    expect(onesZero).toEqual(new Set([true, false]))
  })

  it('is deterministic per seed', () => {
    expect(sampleOperands('sub.borrowBoth', 3, 3, createRng(7))).toEqual(
      sampleOperands('sub.borrowBoth', 3, 3, createRng(7)),
    )
  })

  it('rejects 3-digit-only patterns for 2 digits', () => {
    expect(() => sampleOperands('add.carryTens', 2, 3, createRng(1))).toThrow(RangeError)
  })
})
