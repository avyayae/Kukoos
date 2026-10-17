import type { MisconceptionKey, Op } from '../types'
import { digitCount, fromDigits, toDigits } from './digits'
import { compute } from './solveColumns'

/**
 * Detection priority (spec 003 catalog): algorithmic bugs first, generic slips last.
 * When two bugs produce the same wrong answer, the earlier key wins.
 */
export const MISCONCEPTION_PRIORITY: readonly MisconceptionKey[] = [
  'sub.smallerFromLarger',
  'sub.borrowNoDecrement',
  'sub.acrossZeroSkip',
  'add.forgotCarry',
  'add.wroteWholeSum',
  'wrongOperation',
  'offByOne',
  'offByTen',
]

export type AlgorithmicMisconception = Exclude<MisconceptionKey, 'offByOne' | 'offByTen'>

/** Borrow correctly, except a lending zero column becomes 10 instead of 9 (403 − 178 → 235). */
function acrossZeroSkip(top: readonly number[], bottom: readonly number[]): number | undefined {
  const w = [...top]
  let triggered = false
  for (let i = 0; i < w.length; i++) {
    if ((w[i] as number) >= (bottom[i] as number)) continue
    const j = i + 1
    if (j >= w.length) return undefined
    if (w[j] === 0 && top[j] === 0) {
      let k = j
      while (k < w.length && w[k] === 0) k++
      if (k >= w.length) return undefined
      w[k] = (w[k] as number) - 1
      for (let m = j; m < k; m++) w[m] = 10
      triggered = true
    } else {
      w[j] = (w[j] as number) - 1
    }
    w[i] = (w[i] as number) + 10
  }
  return triggered ? fromDigits(w.map((x, i) => x - (bottom[i] as number))) : undefined
}

/**
 * The answer a kid would give when making each classic mistake on `a op b`.
 * Bugs that happen to give the correct answer are omitted (they can't be detected).
 * Detection and MCQ distractors both come from here, so they never drift apart.
 */
export function simulateBugs(
  a: number,
  b: number,
  op: Op,
): Partial<Record<AlgorithmicMisconception, number>> {
  const width = Math.max(digitCount(a), digitCount(b))
  const top = toDigits(a, width)
  const bottom = toDigits(b, width)
  const correct = compute(a, b, op)
  const bugs: Partial<Record<AlgorithmicMisconception, number>> = {}

  if (op === '-') {
    bugs['sub.smallerFromLarger'] = fromDigits(
      top.map((t, i) => Math.abs(t - (bottom[i] as number))),
    )
    bugs['sub.borrowNoDecrement'] = fromDigits(
      top.map((t, i) => {
        const bt = bottom[i] as number
        return t < bt ? t + 10 - bt : t - bt
      }),
    )
    const skip = acrossZeroSkip(top, bottom)
    if (skip !== undefined) bugs['sub.acrossZeroSkip'] = skip
    bugs.wrongOperation = a + b
  } else {
    bugs['add.forgotCarry'] = fromDigits(top.map((t, i) => (t + (bottom[i] as number)) % 10))
    bugs['add.wroteWholeSum'] = Number(
      top
        .map((t, i) => String(t + (bottom[i] as number)))
        .reverse()
        .join(''),
    )
    bugs.wrongOperation = Math.abs(a - b)
  }

  return Object.fromEntries(
    Object.entries(bugs).filter(([, value]) => value !== correct),
  ) as Partial<Record<AlgorithmicMisconception, number>>
}

/** Generic slips that apply to any numeric answer. */
export function detectSlip(correct: number, answer: number): MisconceptionKey | undefined {
  const diff = Math.abs(answer - correct)
  if (diff === 1) return 'offByOne'
  if (diff === 10 || diff === 100) return 'offByTen'
  return undefined
}

/** Which misconception explains `answer` for `a op b`? Undefined when correct or unexplained. */
export function detectMisconception(
  a: number,
  b: number,
  op: Op,
  answer: number,
): MisconceptionKey | undefined {
  const correct = compute(a, b, op)
  if (answer === correct) return undefined
  const bugs = simulateBugs(a, b, op)
  for (const key of MISCONCEPTION_PRIORITY) {
    if (key === 'offByOne' || key === 'offByTen') break
    if (bugs[key] === answer) return key
  }
  return detectSlip(correct, answer)
}
