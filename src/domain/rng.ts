/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * The domain never uses Math.random (Constitution §3.3): every generated question
 * stores its seed, so it can be reproduced exactly in tests, bug reports and reviews.
 */
export interface Rng {
  readonly seed: number
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number
  /** True with probability p (default 0.5). */
  bool(p?: number): boolean
  /** A random element of a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** A new shuffled array (Fisher–Yates). The input is not mutated. */
  shuffle<T>(items: readonly T[]): T[]
}

export function createRng(seed: number): Rng {
  const normalizedSeed = seed >>> 0
  let state = normalizedSeed

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
      throw new RangeError(`rng.int expects safe integers, got (${min}, ${max})`)
    }
    if (min > max) throw new RangeError(`rng.int: min ${min} > max ${max}`)
    return min + Math.floor(next() * (max - min + 1))
  }

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new RangeError('rng.pick: empty array')
    return items[int(0, items.length - 1)] as T
  }

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[result[i], result[j]] = [result[j] as T, result[i] as T]
    }
    return result
  }

  const bool = (p = 0.5): boolean => next() < p

  return { seed: normalizedSeed, next, int, bool, pick, shuffle }
}
