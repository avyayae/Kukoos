import type { Op, RegroupPattern } from '../types'
import { solveColumns } from './solveColumns'

/** Classifies which columns regroup in `a op b` (spec 003, "Regrouping patterns"). */
export function regroupPattern(a: number, b: number, op: Op): RegroupPattern {
  const steps = solveColumns(a, b, op)
  const ones = steps[0]
  const tens = steps[1]

  if (op === '+') {
    const onesCarry = ones?.carryOut === 1
    const tensCarry = tens?.carryOut === 1
    if (onesCarry && tensCarry) return 'add.carryBoth'
    if (onesCarry) return 'add.carryOnes'
    if (tensCarry) return 'add.carryTens'
    return 'add.none'
  }

  const onesBorrow = ones?.received === true
  const tensBorrow = tens?.received === true
  if (onesBorrow && tens?.top === 0) return 'sub.acrossZero'
  if (onesBorrow && tensBorrow) return 'sub.borrowBoth'
  if (onesBorrow) return 'sub.borrowTens'
  if (tensBorrow) return 'sub.borrowHundreds'
  return 'sub.none'
}

export function patternOp(pattern: RegroupPattern): Op {
  return pattern.startsWith('add.') ? '+' : '-'
}
