import { toDigits } from '@/domain/arithmetic/digits'
import type { ColumnStep } from '@/domain'

/**
 * Scratch work in the column grid: borrow marks and carries. It helps the kid
 * think but is never graded (spec 005: only answer cells are checked).
 */
export interface ColumnScratch {
  /** Current top digits after the kid's trades, ones first. */
  top: number[]
  original: readonly number[]
  /** Carry marks into each place (index 0 unused). */
  carries: boolean[]
}

export function initialScratch(a: number, columns: number): ColumnScratch {
  const top = toDigits(a, columns)
  return { top, original: top, carries: top.map(() => false) }
}

export type TradeResult =
  { ok: true; scratch: ColumnScratch } | { ok: false; reason: 'nothingToTrade' }

/** Kid taps the top digit at `place` to trade one of it to the column on its right. */
export function tradeFrom(scratch: ColumnScratch, place: number): TradeResult {
  const value = scratch.top[place]
  if (place === 0 || value === undefined || value <= 0)
    return { ok: false, reason: 'nothingToTrade' }
  const top = [...scratch.top]
  top[place] = value - 1
  top[place - 1] = (top[place - 1] as number) + 10
  return { ok: true, scratch: { ...scratch, top } }
}

export function toggleCarry(scratch: ColumnScratch, place: number): ColumnScratch {
  const carries = [...scratch.carries]
  carries[place] = !carries[place]
  return { ...scratch, carries }
}

/** The scratch marks a correct solution shows (used when revealing the solution). */
export function solvedScratch(steps: readonly ColumnStep[], columns: number): ColumnScratch {
  const used = steps.slice(0, columns)
  return {
    top: used.map((s) => s.working),
    original: used.map((s) => s.top),
    carries: used.map((s) => s.carryIn === 1),
  }
}
