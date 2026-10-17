import { getSkill } from '../curriculum/skillGraph'
import { createRng } from '../rng'
import {
  DIFFICULTIES,
  type GenerateOptions,
  type Question,
  type SkillId,
  type SkillSpec,
} from '../types'
import { basicFactGenerator } from './basicFacts'
import { columnGenerator } from './columnArithmetic'
import { mixedGenerator } from './mixed'
import { placeValueGenerator } from './placeValue'
import type { Generator } from './shared'

/** Every skill spec type has a generator — the compiler enforces completeness. */
const GENERATORS: Record<SkillSpec['type'], Generator> = {
  basicFact: basicFactGenerator,
  column: columnGenerator,
  mixed: mixedGenerator,
  placeValue: placeValueGenerator,
}

/**
 * The one entry point the app uses. Deterministic: the same (skill, difficulty, kind, seed)
 * always yields a deep-equal question whose id encodes all four (spec 003 AC6).
 */
export function generateQuestion(skillId: SkillId, opts: GenerateOptions): Question {
  const skill = getSkill(skillId)
  if (!skill.kinds.includes(opts.kind)) {
    throw new Error(`Skill ${skillId} doesn't support question kind "${opts.kind}"`)
  }
  if (!DIFFICULTIES.includes(opts.difficulty)) {
    throw new RangeError(`Difficulty must be 1–5, got ${String(opts.difficulty)}`)
  }
  return GENERATORS[skill.spec.type](skill, opts, createRng(opts.seed))
}
