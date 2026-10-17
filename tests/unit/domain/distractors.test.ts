import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { bugAnswers, buildChoices, pickDistractors } from '@/domain/arithmetic/distractors'
import { createRng } from '@/domain/rng'

describe('bugAnswers', () => {
  it('lists simulated bugs in priority order', () => {
    expect(bugAnswers(36, 28, '-')).toEqual([12, 18, 64])
  })

  it('never offers the odd-looking "wrote the whole sum" answer', () => {
    expect(bugAnswers(47, 38, '+')).toEqual([75, 9])
  })
})

describe('pickDistractors (AC9)', () => {
  it('prefers bug answers, then near misses', () => {
    const d = pickDistractors(8, [12, 18, 64], createRng(1))
    expect(d).toEqual([12, 18, 64])
    const withFill = pickDistractors(85, [75], createRng(1))
    expect(withFill[0]).toBe(75)
    expect(withFill).toHaveLength(3)
  })

  it('always returns unique, in-range, non-correct values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        fc.array(fc.integer({ min: -50, max: 2000 }), { maxLength: 6 }),
        fc.integer(),
        (correct, preferred, seed) => {
          const d = pickDistractors(correct, preferred, createRng(seed))
          expect(d).toHaveLength(3)
          expect(new Set(d).size).toBe(3)
          for (const v of d) {
            expect(v).not.toBe(correct)
            expect(v).toBeGreaterThanOrEqual(0)
            expect(v).toBeLessThanOrEqual(999)
          }
        },
      ),
    )
  })

  it('handles answers at the edges (0 and 999)', () => {
    expect(pickDistractors(0, [], createRng(3)).every((v) => v > 0)).toBe(true)
    expect(pickDistractors(999, [], createRng(3)).every((v) => v < 999)).toBe(true)
    expect(pickDistractors(5, [], createRng(3), 3, 6)).toHaveLength(3)
  })

  it('buildChoices contains the answer exactly once', () => {
    const choices = buildChoices(8, [12, 18, 64], createRng(9))
    expect(choices.filter((c) => c === 8)).toHaveLength(1)
    expect([...choices].sort((x, y) => x - y)).toEqual([8, 12, 18, 64])
  })
})
