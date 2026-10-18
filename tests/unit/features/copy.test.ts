import { describe, expect, it } from 'vitest'
import hints from '../../../content/hints.en.json'
import bank from '../../../content/lines.en.json'
import {
  generateQuestion,
  guidedSteps,
  hintFor,
  MISCONCEPTION_PRIORITY,
  SKILLS,
  solutionFor,
  WORLDS,
} from '@/domain'
import { hasMessage, pick, praiseFor, say, t } from '@/features/lesson-player/copy'

describe('lesson copy', () => {
  it('has a message for every misconception', () => {
    for (const key of MISCONCEPTION_PRIORITY)
      expect(hasMessage(`misconception:${key}`), key).toBe(true)
  })

  it('has copy for every hint, guided step and solution the domain can produce, fully filled in', () => {
    for (const skill of SKILLS) {
      for (const kind of skill.kinds) {
        for (let seed = 0; seed < 30; seed++) {
          const q = generateQuestion(skill.id, { difficulty: 3, kind, seed })
          const messages = [
            hintFor(q, null),
            solutionFor(q),
            ...guidedSteps(q),
            ...MISCONCEPTION_PRIORITY.map((m) => hintFor(q, { correct: false, misconception: m })),
          ]
          for (const m of messages) {
            expect(hasMessage(m.key), `${q.id} → ${m.key}`).toBe(true)
            expect(say(m), m.key).not.toMatch(/[{}]/)
          }
          expect(t(`instruction:${kind}`)).not.toBe(t('hint:default'))
        }
      }
    }
  })

  it('rotates praise per world, deterministically', () => {
    for (const w of WORLDS) expect(praiseFor(w.id, 1).length).toBeGreaterThan(0)
    expect(praiseFor('savanna', 0)).toBe('Roar-some!')
    expect(praiseFor('savanna', 20)).toBe(praiseFor('savanna', 0))
    expect(praiseFor('savanna', -1)).toBe(praiseFor('savanna', 19))
    expect(pick('notYet', 1)).toBe('So close!')
  })

  it('never shows a raw key', () => {
    expect(t('nope:missing')).toBe("Let's look again together.")
    expect(pick('nope', 3)).toBe('')
  })

  it('keeps every line of kid copy gentle (constitution §1.2)', () => {
    const lines = [...Object.values(hints.messages), ...Object.values(bank.lists).flat()]
    expect(lines.length).toBeGreaterThan(40)
    for (const line of lines) {
      expect(line, line).not.toMatch(/\b(wrong|incorrect|fail(ed)?|game over|hurry|bad)\b/i)
    }
  })
})
