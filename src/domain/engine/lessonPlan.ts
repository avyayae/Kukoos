import type { QuestionKind, Skill } from '../types'

export interface PlannedKind {
  kind: QuestionKind
  /** Column questions: Kukoos walks through one column at a time. */
  guided: boolean
}

export const LESSON_LENGTH = 10

const k = (kind: QuestionKind, guided = false): PlannedKind => ({ kind, guided })

/**
 * Which question kinds a lesson uses, in order (spec 005, "Kind schedule").
 * Concrete → pictorial → abstract: blocks first, then guided columns, then free practice.
 * Temporary: F06 replaces this with a mastery-driven choice.
 */
export function lessonPlan(skill: Skill): PlannedKind[] {
  const { spec } = skill
  if (spec.type === 'column') {
    return [
      k('tradeBlocks'),
      k('tradeBlocks'),
      k('column', true),
      k('column', true),
      k('column'),
      k('column'),
      k('numeric'),
      k('mcq'),
      k('column'),
      k('trueFalse'),
    ]
  }
  if (spec.type === 'mixed') {
    const round = [k('column', true), k('column'), k('column'), k('numeric'), k('mcq')]
    return [...round, ...round]
  }
  if (spec.type === 'placeValue' && (spec.task === 'tradeTens' || spec.task === 'tradeHundreds')) {
    return [
      ...Array.from({ length: 3 }, () => k('tradeBlocks')),
      ...Array.from({ length: 4 }, () => k('numeric')),
      ...Array.from({ length: 3 }, () => k('mcq')),
    ]
  }
  return Array.from({ length: LESSON_LENGTH }, (_, i) =>
    k(skill.kinds[i % skill.kinds.length] as QuestionKind),
  )
}
