import { patternOp } from '../arithmetic/regroupPattern'
import { sampleOperands } from '../arithmetic/sampleOperands'
import type { ArithmeticMeta } from '../types'
import { columnHints } from './columnArithmetic'
import { arithmeticQuestion, type Generator } from './shared'

/**
 * "Carry or borrow?" skills: a random regrouping pattern from the skill's list.
 * From difficulty 4, numeric/mcq questions may hide an operand instead of the result
 * (`? − 28 = 8`, `47 + ? = 85`). Only off-by slips are diagnosed for those (spec 003 decision 1).
 */
export const mixedGenerator: Generator = (skill, opts, rng) => {
  if (skill.spec.type !== 'mixed') throw new Error(`${skill.id} is not a mixed skill`)
  const pattern = rng.pick(skill.spec.patterns)
  const { a, b } = sampleOperands(pattern, skill.spec.digits, opts.difficulty, rng)
  const missingAllowed =
    opts.difficulty >= 4 && (opts.kind === 'numeric' || opts.kind === 'mcq') && rng.bool()
  const meta: ArithmeticMeta = {
    a,
    b,
    op: patternOp(pattern),
    unknown: missingAllowed ? rng.pick(['a', 'b'] as const) : 'result',
  }
  return arithmeticQuestion(skill, opts, rng, meta, columnHints(meta))
}
