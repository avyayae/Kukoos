import type { Rng } from '../rng'
import type { Difficulty, Op, RegroupPattern } from '../types'
import { fromDigits } from './digits'
import { patternOp } from './regroupPattern'

/**
 * Constructive operand sampler (spec 003 AC7): builds `a` and `b` digit by digit from the
 * ones column up so that exactly the pattern's columns regroup. Every digit is drawn from
 * a range proven non-empty, so there are no retry loops.
 *
 * Difficulty table (documented here as the spec asks):
 * | d | b's width        | zeros inside operands | regrouping columns                      |
 * |---|------------------|-----------------------|-----------------------------------------|
 * | 1 | one digit shorter| no                    | near (sum 10–13 / borrow gap 1–3)       |
 * | 2 | full             | no                    | near                                    |
 * | 3 | full             | no                    | any                                     |
 * | 4 | full             | yes (across-zero: 50% also zero ones, e.g. 500 − 263) | any     |
 * | 5 | full             | yes                   | far (sum ≥ 15 / borrow gap ≥ 4)         |
 */

type Band = 'near' | 'normal' | 'far'

interface Profile {
  bWidth: number
  zeros: boolean
  band: Band
}

function profile(digits: number, difficulty: Difficulty): Profile {
  switch (difficulty) {
    case 1:
      return { bWidth: digits - 1, zeros: false, band: 'near' }
    case 2:
      return { bWidth: digits, zeros: false, band: 'near' }
    case 3:
      return { bWidth: digits, zeros: false, band: 'normal' }
    case 4:
      return { bWidth: digits, zeros: true, band: 'normal' }
    case 5:
      return { bWidth: digits, zeros: true, band: 'far' }
  }
}

/** Which of the ones/tens columns must regroup. The top column never does. */
const REGROUP: Record<RegroupPattern, readonly [boolean, boolean]> = {
  'add.none': [false, false],
  'add.carryOnes': [true, false],
  'add.carryTens': [false, true],
  'add.carryBoth': [true, true],
  'sub.none': [false, false],
  'sub.borrowTens': [true, false],
  'sub.borrowHundreds': [false, true],
  'sub.borrowBoth': [true, true],
  'sub.acrossZero': [true, true],
}

/** Allowed values of a+b+carry (add) or a−lend−b (sub) for a column. */
function targetRange(op: Op, regroup: boolean, band: Band): [number, number] {
  if (op === '+') {
    if (!regroup) return [0, 9]
    return band === 'near' ? [10, 13] : band === 'far' ? [15, 18] : [10, 18]
  }
  if (!regroup) return [0, 9]
  return band === 'near' ? [-3, -1] : band === 'far' ? [-10, -4] : [-10, -1]
}

export interface Operands {
  a: number
  b: number
}

export function sampleOperands(
  pattern: RegroupPattern,
  digits: 2 | 3,
  difficulty: Difficulty,
  rng: Rng,
): Operands {
  const op = patternOp(pattern)
  const regroupCols = REGROUP[pattern]
  if (digits === 2 && regroupCols[1]) {
    throw new RangeError(`${pattern} needs 3 digits`)
  }
  const { bWidth, zeros, band } = profile(digits, difficulty)
  const zeroOnes = pattern === 'sub.acrossZero' && zeros && rng.bool()

  const aDigits: number[] = []
  const bDigits: number[] = []
  let flow = 0 // carry (add) or lend (sub) coming into this column

  for (let i = 0; i < digits; i++) {
    const isTop = i === digits - 1
    const regroup = !isTop && (regroupCols[i] ?? false)

    let aLo = isTop || !zeros ? 1 : 0
    let aHi = 9
    if (pattern === 'sub.acrossZero' && i === 1) aLo = aHi = 0
    if (pattern === 'sub.acrossZero' && i === 0 && zeroOnes) aLo = aHi = 0
    if (pattern === 'sub.borrowBoth' && i === 1) aLo = Math.max(aLo, 1)

    const inB = i < bWidth
    const bLo = !inB ? 0 : i === bWidth - 1 || !zeros ? 1 : 0
    const bHi = inB ? 9 : 0

    const [baseLo, tHi] = targetRange(op, regroup, band)
    // a − b must stay positive for sub.none: make the top column strictly larger.
    const tLo = op === '-' && isTop && pattern === 'sub.none' ? Math.max(baseLo, 1) : baseLo

    // a's feasible range given the target on (a ± b ± flow). The ranges depend only on
    // (pattern, digits, difficulty), and tests sample every combination, so this is never empty.
    const [aMin, aMax] =
      op === '+'
        ? [Math.max(aLo, tLo - flow - bHi), Math.min(aHi, tHi - flow - bLo)]
        : [Math.max(aLo, bLo + tLo + flow), Math.min(aHi, bHi + tHi + flow)]
    /* v8 ignore next 3 -- defensive: unreachable for valid curriculum data */
    if (aMin > aMax) {
      throw new Error(`sampleOperands: no digits for ${pattern} d${difficulty} column ${i}`)
    }
    const a = rng.int(aMin, aMax)
    const [bMin, bMax]: [number, number] =
      op === '+'
        ? [Math.max(bLo, tLo - flow - a), Math.min(bHi, tHi - flow - a)]
        : [Math.max(bLo, a - flow - tHi), Math.min(bHi, a - flow - tLo)]
    const b = rng.int(bMin, bMax)

    aDigits.push(a)
    bDigits.push(b)
    flow = regroup ? 1 : 0
  }

  return { a: fromDigits(aDigits), b: fromDigits(bDigits) }
}

/** Width (digit count) of `b` that sampleOperands produces for a difficulty. */
export function expectedBWidth(digits: number, difficulty: Difficulty): number {
  return profile(digits, difficulty).bWidth
}
