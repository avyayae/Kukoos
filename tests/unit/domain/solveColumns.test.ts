import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { digitCount, fromDigits, toDigits } from '@/domain/arithmetic/digits'
import { resultOf, solveColumns } from '@/domain/arithmetic/solveColumns'

describe('digits', () => {
  it('splits ones first and pads', () => {
    expect(toDigits(403)).toEqual([3, 0, 4])
    expect(toDigits(7, 3)).toEqual([7, 0, 0])
    expect(toDigits(0)).toEqual([0])
    expect(fromDigits([3, 0, 4])).toBe(403)
    expect(fromDigits([5, 10, 2])).toBe(305)
    expect(digitCount(0)).toBe(1)
    expect(digitCount(100)).toBe(3)
  })

  it('rejects negatives', () => {
    expect(() => toDigits(-1)).toThrow(RangeError)
  })
})

describe('solveColumns (AC3)', () => {
  it('is exact for every 2-digit addition', () => {
    for (let a = 0; a < 100; a++) {
      for (let b = 0; b < 100; b++) {
        expect(resultOf(solveColumns(a, b, '+'))).toBe(a + b)
      }
    }
  })

  it('is exact for every 2-digit subtraction', () => {
    for (let a = 0; a < 100; a++) {
      for (let b = 0; b <= a; b++) {
        const steps = solveColumns(a, b, '-')
        expect(resultOf(steps)).toBe(a - b)
        for (const s of steps) {
          expect(s.digit).toBeGreaterThanOrEqual(0)
          expect(s.digit).toBeLessThanOrEqual(9)
        }
      }
    }
  })

  it('is exact for 3-digit addition and subtraction (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), fc.integer({ min: 0, max: 999 }), (x, y) => {
        const [a, b] = x >= y ? [x, y] : [y, x]
        expect(resultOf(solveColumns(a, b, '-'))).toBe(a - b)
        if (a + b <= 999) expect(resultOf(solveColumns(a, b, '+'))).toBe(a + b)
      }),
      { numRuns: 5000 },
    )
  })

  it('records carries for 47 + 38', () => {
    const [ones, tens] = solveColumns(47, 38, '+')
    expect(ones).toMatchObject({ top: 7, bottom: 8, carryIn: 0, carryOut: 1, digit: 5 })
    expect(tens).toMatchObject({ top: 4, bottom: 3, carryIn: 1, carryOut: 0, digit: 8 })
  })

  it('adds a leading column for a final carry (47 + 58 = 105)', () => {
    const steps = solveColumns(47, 58, '+')
    expect(steps).toHaveLength(3)
    expect(steps[2]).toMatchObject({ place: 2, carryIn: 1, digit: 1 })
    expect(resultOf(steps)).toBe(105)
  })

  it('records borrowing for 36 − 28', () => {
    const [ones, tens] = solveColumns(36, 28, '-')
    expect(ones).toMatchObject({ top: 6, working: 16, received: true, lent: false, digit: 8 })
    expect(tens).toMatchObject({ top: 3, working: 2, received: false, lent: true, digit: 0 })
  })

  it('borrows across zero for 403 − 178 (the zero becomes 9)', () => {
    const [ones, tens, hundreds] = solveColumns(403, 178, '-')
    expect(ones).toMatchObject({ working: 13, received: true, digit: 5 })
    expect(tens).toMatchObject({ top: 0, working: 9, received: true, lent: true, digit: 2 })
    expect(hundreds).toMatchObject({ top: 4, working: 3, lent: true, received: false, digit: 2 })
  })

  it('pads the shorter operand', () => {
    const steps = solveColumns(652, 38, '-')
    expect(steps).toHaveLength(3)
    expect(steps[2]).toMatchObject({ bottom: 0, digit: 6 })
  })

  it('rejects out-of-range problems', () => {
    expect(() => solveColumns(500, 600, '+')).toThrow(RangeError)
    expect(() => solveColumns(3, 5, '-')).toThrow(RangeError)
    expect(() => solveColumns(1000, 1, '-')).toThrow(RangeError)
    expect(() => solveColumns(1.5, 1, '+')).toThrow(RangeError)
  })
})
