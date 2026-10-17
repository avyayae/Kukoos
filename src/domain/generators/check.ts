import { digitCount, fromDigits } from '../arithmetic/digits'
import { detectMisconception, detectSlip } from '../arithmetic/misconceptions'
import { solveColumns } from '../arithmetic/solveColumns'
import type { CheckResult, Question, Response, StepError } from '../types'

function mismatch(q: Question, r: Response): never {
  throw new TypeError(`A "${r.kind}" response doesn't fit a ${q.kind} question (${q.id})`)
}

function columnStepErrors(q: Question, digits: readonly (number | null)[]): StepError[] {
  if (q.payload.kind !== 'column') return mismatch(q, { kind: 'columnDigits', digits })
  const { a, b, op } = q.payload
  const steps = solveColumns(a, b, op)
  const correct = q.answer.type === 'number' ? q.answer.value : 0
  const significant = digitCount(correct)
  const errors: StepError[] = []
  for (let column = 0; column < Math.max(steps.length, digits.length); column++) {
    const expected = steps[column]?.digit ?? 0
    const got = digits[column] ?? null
    // Leading positions may be left empty (352 − 348 = 4 → only the ones cell is filled).
    if (got === null && column >= significant) continue
    if (got !== expected) errors.push({ column, expected, got })
  }
  return errors
}

/**
 * Checks a kid's response. Diagnoses misconceptions for wrong numeric answers
 * (full catalog for `a op b = ?`, off-by slips otherwise) and, for column
 * responses, which columns are wrong (spec 003 AC8, AC10).
 */
export function check(q: Question, r: Response): CheckResult {
  const { answer } = q

  if (answer.type === 'comparison') {
    if (r.kind !== 'comparison') return mismatch(q, r)
    return { correct: r.value === answer.value }
  }
  if (answer.type === 'boolean') {
    if (r.kind !== 'boolean') return mismatch(q, r)
    return { correct: r.value === answer.value }
  }

  let value: number
  if (r.kind === 'number') {
    value = r.value
  } else if (r.kind === 'choice') {
    if (q.payload.kind !== 'mcq') return mismatch(q, r)
    const choice = q.payload.choices[r.index]
    if (choice === undefined) throw new RangeError(`No choice ${r.index} in ${q.id}`)
    value = choice
  } else if (r.kind === 'columnDigits') {
    for (const d of r.digits) {
      if (d !== null && (!Number.isInteger(d) || d < 0 || d > 9)) {
        throw new RangeError(`Column digit out of range: ${d}`)
      }
    }
    value = fromDigits(r.digits.map((d) => d ?? 0))
  } else {
    return mismatch(q, r)
  }

  const correct = value === answer.value
  const result: CheckResult = { correct }
  if (!correct) {
    const m = q.arithmetic
    const misconception =
      m && m.unknown === 'result'
        ? detectMisconception(m.a, m.b, m.op, value)
        : detectSlip(answer.value, value)
    if (misconception) result.misconception = misconception
  }
  if (r.kind === 'columnDigits') {
    const stepErrors = columnStepErrors(q, r.digits)
    if (stepErrors.length > 0) result.stepErrors = stepErrors
  }
  return result
}
