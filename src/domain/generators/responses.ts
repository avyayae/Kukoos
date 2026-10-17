import { toDigits } from '../arithmetic/digits'
import type { Comparison, Question, Response } from '../types'

/** The response a kid would give to answer correctly (used for solution reveals and tests). */
export function correctResponse(q: Question): Response {
  const { answer, payload } = q
  if (answer.type === 'comparison') return { kind: 'comparison', value: answer.value }
  if (answer.type === 'boolean') return { kind: 'boolean', value: answer.value }
  if (payload.kind === 'mcq')
    return { kind: 'choice', index: payload.choices.indexOf(answer.value) }
  if (payload.kind === 'column') return { kind: 'columnDigits', digits: toDigits(answer.value) }
  return { kind: 'number', value: answer.value }
}

const OTHER_SIGN: Record<Comparison, Comparison> = { '<': '>', '>': '<', '=': '<' }

/** A response that is definitely wrong, in the same shape as the correct one. */
export function wrongResponse(q: Question, value?: number): Response {
  const { answer, payload } = q
  if (answer.type === 'comparison') return { kind: 'comparison', value: OTHER_SIGN[answer.value] }
  if (answer.type === 'boolean') return { kind: 'boolean', value: !answer.value }
  const wrong = value ?? answer.value + 1
  if (payload.kind === 'mcq') {
    const index = payload.choices.findIndex((c) => c !== answer.value)
    return { kind: 'choice', index }
  }
  if (payload.kind === 'column') return { kind: 'columnDigits', digits: toDigits(wrong) }
  return { kind: 'number', value: wrong }
}
