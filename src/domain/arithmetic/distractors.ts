import type { Rng } from '../rng'
import type { Op } from '../types'
import { MISCONCEPTION_PRIORITY, simulateBugs } from './misconceptions'

/** Largest number a choice may show (all MVP answers are ≤ 999). */
export const MAX_CHOICE = 999

/**
 * Wrong answers a kid would plausibly give for `a op b`, in priority order.
 * `add.wroteWholeSum` is excluded: numbers like 715 look odd as a choice (spec 003 decision 2).
 */
export function bugAnswers(a: number, b: number, op: Op): number[] {
  const bugs = simulateBugs(a, b, op)
  return MISCONCEPTION_PRIORITY.flatMap((key) => {
    if (key === 'add.wroteWholeSum' || key === 'offByOne' || key === 'offByTen') return []
    const value = bugs[key]
    return value === undefined ? [] : [value]
  })
}

/**
 * `count` unique wrong answers: preferred ones first (e.g. simulated bugs), then near misses
 * (±1, ±10, ±100, ±2) in seeded random order. All are integers in [0, max] and ≠ correct.
 */
export function pickDistractors(
  correct: number,
  preferred: readonly number[],
  rng: Rng,
  count = 3,
  max = MAX_CHOICE,
): number[] {
  const nearMisses = rng.shuffle([1, -1, 10, -10, 100, -100, 2, -2].map((d) => correct + d))
  const fallback = Array.from({ length: count + 10 }, (_, i) => correct + 3 + i)
  const picked: number[] = []
  for (const value of [...preferred, ...nearMisses, ...fallback]) {
    if (picked.length === count) break
    if (!Number.isInteger(value) || value < 0 || value > max) continue
    if (value === correct || picked.includes(value)) continue
    picked.push(value)
  }
  if (picked.length < count) {
    // Only possible when `correct` sits at the top of a tiny range; fill downward.
    for (let v = correct - 3; v >= 0 && picked.length < count; v--) {
      if (!picked.includes(v)) picked.push(v)
    }
  }
  return picked
}

/** Correct answer plus distractors, in seeded random order. */
export function buildChoices(correct: number, distractors: readonly number[], rng: Rng): number[] {
  return rng.shuffle([correct, ...distractors])
}
