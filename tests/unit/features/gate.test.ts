import { describe, expect, it } from 'vitest'
import { makeRecoveryQuestion } from '@/features/grownups/gate'

describe('forgot-PIN question (spec 011 AC4)', () => {
  it('is a 2-digit × 2-digit product', () => {
    for (let i = 0; i < 200; i++) {
      const q = makeRecoveryQuestion()
      expect(q.a).toBeGreaterThanOrEqual(23)
      expect(q.a).toBeLessThanOrEqual(89)
      expect(q.b).toBeGreaterThanOrEqual(12)
      expect(q.b).toBeLessThanOrEqual(39)
      expect(q.answer).toBe(q.a * q.b)
    }
  })

  it('takes injectable randomness', () => {
    expect(makeRecoveryQuestion(() => 0)).toEqual({ a: 23, b: 12, answer: 276 })
  })
})
