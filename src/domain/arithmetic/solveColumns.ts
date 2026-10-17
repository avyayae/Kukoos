import type { ColumnStep, Op } from '../types'
import { digitCount, fromDigits, toDigits } from './digits'

export const MAX_OPERAND = 999

function assertOperands(a: number, b: number, op: Op) {
  for (const n of [a, b]) {
    if (!Number.isSafeInteger(n) || n < 0 || n > MAX_OPERAND) {
      throw new RangeError(`operands must be integers 0–${MAX_OPERAND}, got ${a} ${op} ${b}`)
    }
  }
  if (op === '+' && a + b > MAX_OPERAND)
    throw new RangeError(`sum ${a} + ${b} exceeds ${MAX_OPERAND}`)
  if (op === '-' && a < b) throw new RangeError(`negative difference ${a} − ${b}`)
}

/**
 * Solves `a op b` the way it's taught in the column method, ones column first.
 * The single source of truth for regrouping: pattern classification, worked-example
 * hints and column step checking all derive from these steps (spec 003 AC3).
 */
export function solveColumns(a: number, b: number, op: Op): ColumnStep[] {
  assertOperands(a, b, op)
  const width = Math.max(digitCount(a), digitCount(b))
  const top = toDigits(a, width)
  const bottom = toDigits(b, width)

  if (op === '+') {
    // Typed via `as` so TS doesn't narrow it to 0 (it's reassigned inside the callback).
    let carry = 0 as 0 | 1
    const steps = top.map((t, place): ColumnStep => {
      const bt = bottom[place] as number
      const sum = t + bt + carry
      const carryOut: 0 | 1 = sum >= 10 ? 1 : 0
      const step: ColumnStep = {
        place,
        top: t,
        bottom: bt,
        working: t,
        lent: false,
        received: false,
        carryIn: carry,
        carryOut,
        digit: sum % 10,
      }
      carry = carryOut
      return step
    })
    // A carry out of the top column becomes a new leading column (47 + 58 = 105).
    if (carry === 1) {
      steps.push({
        place: width,
        top: 0,
        bottom: 0,
        working: 0,
        lent: false,
        received: false,
        carryIn: 1,
        carryOut: 0,
        digit: 1,
      })
    }
    return steps
  }

  // Subtraction: borrow from the left; a lending 0 becomes -1, then itself borrows (→ 9).
  const working = [...top]
  const lent = top.map(() => false)
  const received = top.map(() => false)
  for (let place = 0; place < width; place++) {
    if ((working[place] as number) < (bottom[place] as number)) {
      working[place] = (working[place] as number) + 10
      working[place + 1] = (working[place + 1] as number) - 1
      received[place] = true
      lent[place + 1] = true
    }
  }
  return top.map((t, place) => {
    const w = working[place] as number
    const bt = bottom[place] as number
    return {
      place,
      top: t,
      bottom: bt,
      working: w,
      lent: lent[place] as boolean,
      received: received[place] as boolean,
      carryIn: 0,
      carryOut: 0,
      digit: w - bt,
    }
  })
}

/** The answer the steps spell out. */
export function resultOf(steps: readonly ColumnStep[]): number {
  return fromDigits(steps.map((s) => s.digit))
}

export function compute(a: number, b: number, op: Op): number {
  return op === '+' ? a + b : a - b
}
