import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRng } from '@/domain/rng'

const seedArb = fc.integer({ min: 0, max: 0xffffffff })

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const a = createRng(seed)
        const b = createRng(seed)
        const seqA = Array.from({ length: 20 }, () => a.next())
        const seqB = Array.from({ length: 20 }, () => b.next())
        expect(seqA).toEqual(seqB)
      }),
    )
  })

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 5 }, createRng(1).next)
    const b = Array.from({ length: 5 }, createRng(2).next)
    expect(a).not.toEqual(b)
  })

  it('next() stays in [0, 1)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const rng = createRng(seed)
        for (let i = 0; i < 100; i++) {
          const v = rng.next()
          expect(v).toBeGreaterThanOrEqual(0)
          expect(v).toBeLessThan(1)
        }
      }),
    )
  })

  it('int(min, max) always returns an integer within the inclusive range', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (seed, min, span) => {
          const rng = createRng(seed)
          const max = min + span
          for (let i = 0; i < 20; i++) {
            const v = rng.int(min, max)
            expect(Number.isInteger(v)).toBe(true)
            expect(v).toBeGreaterThanOrEqual(min)
            expect(v).toBeLessThanOrEqual(max)
          }
        },
      ),
    )
  })

  it('int() reaches both ends of a small range', () => {
    const rng = createRng(42)
    const seen = new Set(Array.from({ length: 200 }, () => rng.int(1, 3)))
    expect([...seen].sort()).toEqual([1, 2, 3])
  })

  it('int() rejects invalid ranges', () => {
    const rng = createRng(1)
    expect(() => rng.int(5, 1)).toThrow(RangeError)
    expect(() => rng.int(0.5, 2)).toThrow(RangeError)
  })

  it('pick() returns an element of the array and rejects empty arrays', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { minLength: 1 }), (seed, items) => {
        expect(items).toContain(createRng(seed).pick(items))
      }),
    )
    expect(() => createRng(1).pick([])).toThrow(RangeError)
  })

  it('shuffle() returns a permutation without mutating the input', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer()), (seed, items) => {
        const copy = [...items]
        const shuffled = createRng(seed).shuffle(items)
        expect(items).toEqual(copy)
        expect([...shuffled].sort((x, y) => x - y)).toEqual([...items].sort((x, y) => x - y))
      }),
    )
  })

  it('normalizes the seed to an unsigned 32-bit integer', () => {
    expect(createRng(-1).seed).toBe(0xffffffff)
    expect(createRng(-1).next()).toBe(createRng(0xffffffff).next())
  })
})
