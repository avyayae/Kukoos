import { patternOp } from '../arithmetic/regroupPattern'
import { sampleOperands } from '../arithmetic/sampleOperands'
import { solveColumns } from '../arithmetic/solveColumns'
import type { ArithmeticMeta, Hint } from '../types'
import { arithmeticQuestion, type Generator } from './shared'

export function columnHints(m: ArithmeticMeta): Hint[] {
  return [
    { type: 'visual', visual: 'baseTen' },
    { type: 'workedExample', steps: solveColumns(m.a, m.b, m.op) },
  ]
}

/** All add/sub column skills; operands come from the constructive sampler (difficulty table there). */
export const columnGenerator: Generator = (skill, opts, rng) => {
  if (skill.spec.type !== 'column') throw new Error(`${skill.id} is not a column skill`)
  const { pattern, digits } = skill.spec
  const { a, b } = sampleOperands(pattern, digits, opts.difficulty, rng)
  const meta: ArithmeticMeta = { a, b, op: patternOp(pattern), unknown: 'result' }
  return arithmeticQuestion(skill, opts, rng, meta, columnHints(meta))
}
