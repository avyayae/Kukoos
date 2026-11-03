// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SPANISH_SKILLS, skillsBefore } from '@/domain/spanish/curriculum'
import {
  choiceCount,
  generateSpanishQuestion,
  type SpanishDifficulty,
} from '@/domain/spanish/questions'
import { getWord, pictureKey, shown, wordsOf } from '@/domain/spanish/words'

const SEEDS = 300
const DIFFICULTIES: SpanishDifficulty[] = [1, 2, 3]

describe('Spanish questions: every skill × kind × difficulty × 300 seeds (spec 019 AC3)', () => {
  for (const skill of SPANISH_SKILLS) {
    for (const kind of [...skill.kinds, 'say' as const]) {
      it(`${skill.id} [${kind}]`, () => {
        const own = new Set(wordsOf(skill.id).map((w) => w.id))
        const earlier = new Set(
          skillsBefore(skill.id).flatMap((s) => wordsOf(s.id).map((w) => w.id)),
        )
        for (const difficulty of DIFFICULTIES) {
          for (let seed = 0; seed < SEEDS; seed++) {
            const q = generateSpanishQuestion(skill.id, { kind, difficulty, seed })
            expect(own.has(q.answer.id)).toBe(true)
            expect(q.word.length).toBeGreaterThan(0)
            if (kind === 'say') {
              expect(q.choices).toEqual([])
              continue
            }
            const ids = q.choices.map((c) => c.id)
            expect(ids.filter((id) => id === q.answer.id)).toHaveLength(1)
            expect(q.choices).toHaveLength(choiceCount(kind, difficulty))
            expect(new Set(q.choices.map((c) => pictureKey(c.picture))).size).toBe(ids.length)
            expect(new Set(q.choices.map(shown)).size).toBe(ids.length)
            for (const c of q.choices) {
              expect(getWord(c.id)).toBe(c)
              expect(own.has(c.id) || earlier.has(c.id)).toBe(true)
              expect('number' in c.picture).toBe('number' in q.answer.picture)
            }
          }
        }
      })
    }
  }

  it('the same seed gives the same question', () => {
    const a = generateSpanishQuestion('es.pets', { kind: 'listen', difficulty: 3, seed: 42 })
    const b = generateSpanishQuestion('es.pets', { kind: 'listen', difficulty: 3, seed: 42 })
    expect(b).toEqual(a)
  })

  it('difficulty 3 mixes in an earlier word when there is one', () => {
    let mixed = 0
    for (let seed = 0; seed < 50; seed++) {
      const q = generateSpanishQuestion('es.farm', { kind: 'listen', difficulty: 3, seed })
      const own = new Set(wordsOf('es.farm').map((w) => w.id))
      if (q.choices.some((c) => !own.has(c.id))) mixed++
    }
    expect(mixed).toBe(50)
  })

  it('never shows the orange fruit with the orange colour', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateSpanishQuestion('es.fruit', { kind: 'listen', difficulty: 3, seed })
      const ids = q.choices.map((c) => c.id)
      expect(ids.includes('naranja') && ids.includes('anaranjado')).toBe(false)
    }
  })
})
