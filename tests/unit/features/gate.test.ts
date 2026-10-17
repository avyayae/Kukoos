import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { makeGateQuestion } from '@/features/grownups/gate'

describe('grown-up gate question (AC8)', () => {
  it('asks 12–19 × 3–9 with 4 unique positive choices including the answer', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 0.999999, noNaN: true }), { minLength: 8, maxLength: 8 }),
        (xs) => {
          let i = 0
          const q = makeGateQuestion(() => xs[i++ % xs.length] as number)
          expect(q.a).toBeGreaterThanOrEqual(12)
          expect(q.a).toBeLessThanOrEqual(19)
          expect(q.b).toBeGreaterThanOrEqual(3)
          expect(q.b).toBeLessThanOrEqual(9)
          expect(q.answer).toBe(q.a * q.b)
          expect(q.choices).toHaveLength(4)
          expect(new Set(q.choices).size).toBe(4)
          expect(q.choices).toContain(q.answer)
          expect(q.choices.every((c) => c > 0)).toBe(true)
        },
      ),
    )
  })
})
