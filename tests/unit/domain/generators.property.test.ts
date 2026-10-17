// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { digitCount, toDigits } from '@/domain/arithmetic/digits'
import { regroupPattern } from '@/domain/arithmetic/regroupPattern'
import { SKILLS } from '@/domain/curriculum/skills'
import { generateQuestion } from '@/domain/generators/registry'
import { DIFFICULTIES, type Display, type Question, type Skill } from '@/domain/types'

const SEEDS = 500

/** Recomputes the right answer from what the question *shows*, independently of the generator. */
function answerFromDisplay(q: Question): number | string | boolean {
  const p = q.payload
  if (p.kind === 'compare') {
    return p.left < p.right ? '<' : p.left > p.right ? '>' : '='
  }
  if (p.kind === 'column') return p.op === '+' ? p.a + p.b : p.a - p.b
  const display: Display = p.display
  if (display.type === 'digitInPlace') return toDigits(display.number, 3)[display.place] as number
  if (display.type === 'units') {
    const h = display.hundreds ?? 0
    const { tens: t, ones: o, total } = display
    if (total === null) return (h as number) * 100 + (t as number) * 10 + (o as number)
    if (h === null) return (total - (t as number) * 10 - (o as number)) / 100
    if (t === null) return (total - h * 100 - (o as number)) / 10
    return total - h * 100 - (t as number) * 10
  }
  const { terms, ops, result } = display.equation
  const apply = (values: number[]) =>
    values.slice(1).reduce((acc, v, i) => (ops[i] === '-' ? acc - v : acc + v), values[0] as number)
  if (p.kind === 'trueFalse') {
    return apply(terms as number[]) === result
  }
  if (result === null) return apply(terms as number[])
  // One hidden term: solve for it.
  const hidden = terms.indexOf(null)
  for (let guess = 0; guess <= 999; guess++) {
    if (apply(terms.map((t, i) => (i === hidden ? guess : (t as number)))) === result) return guess
  }
  throw new Error(`unsolvable equation in ${q.id}`)
}

function assertSkillConstraints(skill: Skill, q: Question) {
  const m = q.arithmetic
  if (skill.spec.type === 'column' || skill.spec.type === 'mixed') {
    if (!m) throw new Error(`${q.id} has no arithmetic meta`)
    const pattern = regroupPattern(m.a, m.b, m.op)
    if (skill.spec.type === 'column') {
      expect(pattern, q.id).toBe(skill.spec.pattern)
    } else {
      expect(skill.spec.patterns, q.id).toContain(pattern)
    }
    expect(digitCount(m.a), q.id).toBe(skill.spec.digits)
    const result = m.op === '+' ? m.a + m.b : m.a - m.b
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10 ** skill.spec.digits)
  }
  if (skill.spec.type === 'basicFact') {
    if (!m) throw new Error(`${q.id} has no arithmetic meta`)
    expect(Math.max(m.a, m.a + (m.op === '+' ? m.b : 0))).toBeLessThanOrEqual(20)
    expect(m.op === '-' ? m.a - m.b : m.a + m.b).toBeGreaterThanOrEqual(0)
  }
}

describe('generators: every skill × difficulty × kind × 500 seeds (AC5, AC6, AC9, AC11)', () => {
  for (const skill of SKILLS) {
    for (const kind of skill.kinds) {
      it(`${skill.id} [${kind}]`, () => {
        for (const difficulty of DIFFICULTIES) {
          for (let seed = 0; seed < SEEDS; seed++) {
            const q = generateQuestion(skill.id, { difficulty, kind, seed })
            const id = `${skill.id}:${difficulty}:${kind}:${seed}`
            expect(q.id).toBe(id)
            expect(q.payload.kind).toBe(kind)
            expect(q.prompt.text.length, id).toBeGreaterThan(0)
            expect(`${q.prompt.text} ${q.prompt.speech}`, id).not.toMatch(/undefined|NaN/)
            expect(q.hints.length, id).toBeGreaterThan(0)

            // Answer = independent recomputation from the display.
            expect(q.answer.value, id).toBe(answerFromDisplay(q))
            if (q.answer.type === 'number') {
              expect(Number.isInteger(q.answer.value)).toBe(true)
              expect(q.answer.value).toBeGreaterThanOrEqual(0)
              expect(q.answer.value).toBeLessThanOrEqual(999)
            }

            assertSkillConstraints(skill, q)

            if (q.payload.kind === 'mcq') {
              const { choices } = q.payload
              expect(choices, id).toHaveLength(4)
              expect(new Set(choices).size, id).toBe(4)
              expect(
                choices.filter((c) => c === q.answer.value),
                id,
              ).toHaveLength(1)
              for (const c of choices) expect(c >= 0 && c <= 999, id).toBe(true)
            }
            if (q.payload.kind === 'tradeBlocks') {
              const { hundreds, tens, ones } = q.payload.start
              const shown = hundreds * 100 + tens * 10 + ones
              const expected =
                q.arithmetic?.a ??
                (q.payload.display.type === 'units' ? q.payload.display.total : undefined)
              expect(shown, id).toBe(expected)
            }

            if (seed < 10) {
              expect(generateQuestion(skill.id, { difficulty, kind, seed }), id).toEqual(q)
            }
          }
        }
      })
    }
  }

  it('produces both true and false trueFalse questions', () => {
    const answers = new Set(
      Array.from(
        { length: 40 },
        (_, seed) =>
          generateQuestion('sub.within100.regroup', { difficulty: 3, kind: 'trueFalse', seed })
            .answer.value,
      ),
    )
    expect(answers).toEqual(new Set([true, false]))
  })

  it('hides an operand in some difficulty-4 mixed questions', () => {
    const unknowns = new Set(
      Array.from(
        { length: 60 },
        (_, seed) =>
          generateQuestion('addsub.3digit.mixed', { difficulty: 4, kind: 'numeric', seed })
            .arithmetic?.unknown,
      ),
    )
    expect(unknowns).toEqual(new Set(['result', 'a', 'b']))
  })

  it('reads plain problems aloud naturally', () => {
    const q = generateQuestion('sub.within100.regroup', { difficulty: 3, kind: 'numeric', seed: 1 })
    expect(q.prompt.speech).toMatch(/^What is [a-z-]+ minus [a-z-]+\?$/)
  })

  it('rejects unsupported kinds, unknown skills and bad difficulties', () => {
    expect(() =>
      generateQuestion('pv.compare3digit', { difficulty: 1, kind: 'numeric', seed: 1 }),
    ).toThrow(/doesn't support/)
    expect(() => generateQuestion('nope', { difficulty: 1, kind: 'numeric', seed: 1 })).toThrow(
      /Unknown skill/,
    )
    expect(() =>
      generateQuestion('add.within20', { difficulty: 9 as 1, kind: 'numeric', seed: 1 }),
    ).toThrow(RangeError)
  })
})
