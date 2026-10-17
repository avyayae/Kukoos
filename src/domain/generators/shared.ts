import { bugAnswers, buildChoices, pickDistractors } from '../arithmetic/distractors'
import { digitCount } from '../arithmetic/digits'
import { compute } from '../arithmetic/solveColumns'
import type { Rng } from '../rng'
import { equationToSpeech, equationToText, numberToWords, OP_SYMBOL } from '../speech'
import type {
  ArithmeticMeta,
  Blocks,
  Display,
  Equation,
  GenerateOptions,
  Hint,
  Question,
  Skill,
} from '../types'

export type Generator = (skill: Skill, opts: GenerateOptions, rng: Rng) => Question

export function questionId(skillId: string, opts: GenerateOptions): string {
  return `${skillId}:${opts.difficulty}:${opts.kind}:${opts.seed}`
}

type QuestionParts = Pick<Question, 'prompt' | 'payload' | 'answer' | 'hints'> & {
  arithmetic?: ArithmeticMeta
}

export function makeQuestion(skill: Skill, opts: GenerateOptions, parts: QuestionParts): Question {
  return {
    id: questionId(skill.id, opts),
    skillId: skill.id,
    difficulty: opts.difficulty,
    kind: opts.kind,
    seed: opts.seed,
    ...parts,
  }
}

export function unsupportedKind(skill: Skill, kind: string): never {
  throw new Error(`Skill ${skill.id} doesn't support question kind "${kind}"`)
}

export function blocksOf(n: number): Blocks {
  return { hundreds: Math.floor(n / 100), tens: Math.floor(n / 10) % 10, ones: n % 10 }
}

/** The value the kid must find in `a op b = c`. */
export function unknownValue(m: ArithmeticMeta): number {
  return m.unknown === 'a' ? m.a : m.unknown === 'b' ? m.b : compute(m.a, m.b, m.op)
}

export function equationOf(m: ArithmeticMeta, shownResult?: number): Equation {
  return {
    terms: [m.unknown === 'a' ? null : m.a, m.unknown === 'b' ? null : m.b],
    ops: [m.op],
    result: m.unknown === 'result' ? (shownResult ?? null) : compute(m.a, m.b, m.op),
  }
}

/** "What is thirty-six minus twenty-eight?" for plain problems, full equation otherwise. */
export function askSpeech(eq: Equation): string {
  const [first, second] = eq.terms
  if (eq.result === null && typeof first === 'number' && typeof second === 'number') {
    const op = eq.ops[0] === '-' ? 'minus' : 'plus'
    return `What is ${numberToWords(first)} ${op} ${numberToWords(second)}?`
  }
  return `${equationToSpeech(eq)}?`
}

/**
 * Builds any arithmetic question kind for `a op b` (with an optional hidden operand).
 * Used by basic facts, column skills, mixed skills and ±10/±100.
 */
export function arithmeticQuestion(
  skill: Skill,
  opts: GenerateOptions,
  rng: Rng,
  m: ArithmeticMeta,
  hints: readonly Hint[],
): Question {
  const correct = unknownValue(m)
  const eq = equationOf(m)
  const display: Display = { type: 'equation', equation: eq }
  const text = equationToText(eq)
  const speech = askSpeech(eq)
  const answer = { type: 'number', value: correct } as const
  const base = { hints, arithmetic: m }
  const plain = m.unknown === 'result'
  const needsPlain = () => {
    if (!plain) throw new Error(`${opts.kind} questions need unknown = result`)
  }

  switch (opts.kind) {
    case 'numeric':
      return makeQuestion(skill, opts, {
        ...base,
        prompt: { text, speech },
        payload: { kind: 'numeric', display },
        answer,
      })
    case 'mcq': {
      const preferred = plain ? bugAnswers(m.a, m.b, m.op) : []
      const choices = buildChoices(correct, pickDistractors(correct, preferred, rng), rng)
      return makeQuestion(skill, opts, {
        ...base,
        prompt: { text, speech: `${speech} Pick the answer.` },
        payload: { kind: 'mcq', display, choices },
        answer,
      })
    }
    case 'trueFalse': {
      needsPlain()
      const isTrue = rng.bool()
      const shown = isTrue
        ? correct
        : (pickDistractors(correct, bugAnswers(m.a, m.b, m.op), rng, 1)[0] as number)
      const shownEq = equationOf(m, shown)
      return makeQuestion(skill, opts, {
        ...base,
        prompt: {
          text: `${equationToText(shownEq)}. True or false?`,
          speech: `Is it true? ${equationToSpeech(shownEq)}.`,
        },
        payload: { kind: 'trueFalse', display: { type: 'equation', equation: shownEq } },
        answer: { type: 'boolean', value: isTrue },
      })
    }
    case 'column':
      needsPlain()
      return makeQuestion(skill, opts, {
        ...base,
        prompt: { text, speech: `${speech} Solve it in columns.` },
        payload: {
          kind: 'column',
          a: m.a,
          b: m.b,
          op: m.op,
          columns: Math.max(digitCount(m.a), digitCount(m.b)),
        },
        answer,
      })
    case 'tradeBlocks':
      needsPlain()
      return makeQuestion(skill, opts, {
        ...base,
        prompt: {
          text: `${m.a} ${OP_SYMBOL[m.op]} ${m.b} with blocks`,
          speech: `${speech} Use the blocks.`,
        },
        payload: {
          kind: 'tradeBlocks',
          display,
          start: blocksOf(m.a),
          task: m.op === '+' ? 'add' : 'subtract',
        },
        answer,
      })
    default:
      return unsupportedKind(skill, opts.kind)
  }
}

/** Like rng.pick but over an inclusive integer range minus some excluded values. */
export function intExcluding(
  rng: Rng,
  min: number,
  max: number,
  exclude: readonly number[],
): number {
  const options: number[] = []
  for (let v = min; v <= max; v++) if (!exclude.includes(v)) options.push(v)
  return rng.pick(options)
}
