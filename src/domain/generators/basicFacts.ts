import type { Rng } from '../rng'
import type { Difficulty } from '../types'
import { arithmeticQuestion, type Generator } from './shared'

/**
 * Addition facts within 20 (subtraction facts are their inverse).
 * | d | rule                                   | example  |
 * |---|----------------------------------------|----------|
 * | 1 | both addends 1–5                       | 3 + 4    |
 * | 2 | sum ≤ 10                               | 6 + 3    |
 * | 3 | crosses ten, sum 11–14 (make-10)       | 8 + 5    |
 * | 4 | crosses ten, sum 11–18                 | 9 + 7    |
 * | 5 | teen + one digit, sum ≤ 20             | 13 + 6   |
 */
export function sampleAdditionFact(difficulty: Difficulty, rng: Rng): { p: number; q: number } {
  switch (difficulty) {
    case 1:
      return { p: rng.int(1, 5), q: rng.int(1, 5) }
    case 2: {
      const p = rng.int(1, 9)
      return { p, q: rng.int(1, 10 - p) }
    }
    case 3: {
      const p = rng.int(2, 9)
      return { p, q: rng.int(Math.max(2, 11 - p), Math.min(9, 14 - p)) }
    }
    case 4: {
      const p = rng.int(2, 9)
      return { p, q: rng.int(Math.max(2, 11 - p), 9) }
    }
    case 5: {
      const p = rng.int(10, 19)
      return { p, q: rng.int(1, 20 - p) }
    }
  }
}

export const basicFactGenerator: Generator = (skill, opts, rng) => {
  if (skill.spec.type !== 'basicFact') throw new Error(`${skill.id} is not a basic-fact skill`)
  const { p, q } = sampleAdditionFact(opts.difficulty, rng)
  const meta =
    skill.spec.op === '+'
      ? { a: p, b: q, op: '+' as const, unknown: 'result' as const }
      : { a: p + q, b: q, op: '-' as const, unknown: 'result' as const }
  return arithmeticQuestion(skill, opts, rng, meta, [
    { type: 'visual', visual: 'tenFrame' },
    { type: 'text', key: `${skill.id}.strategy` },
  ])
}
