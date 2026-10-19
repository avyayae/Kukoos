import type { MisconceptionKey } from '@/domain'

/** Grown-up names for the regrouping bugs the checker detects (spec 011 AC7). */
export const MISTAKES: Record<MisconceptionKey, { label: string; example: string; tip: string }> = {
  'sub.smallerFromLarger': {
    label: 'Smaller from larger',
    example: '36 − 28 → 12 (took 6 from 8 instead of trading)',
    tip: 'Before subtracting the ones, ask: can I take this many? If not, trade a ten.',
  },
  'sub.borrowNoDecrement': {
    label: 'Traded but kept the ten',
    example: '52 − 28 → 34 (used 12 ones but left 5 tens)',
    tip: 'After trading, cross the ten out and write one less.',
  },
  'sub.acrossZeroSkip': {
    label: 'Borrowing across zero',
    example: '403 − 178 → 235 (the zero became 10, not 9)',
    tip: 'No tens to trade? Open a hundred into 10 tens first.',
  },
  'add.forgotCarry': {
    label: 'Forgot the carry',
    example: '47 + 38 → 75 (dropped the extra ten)',
    tip: 'When a column makes 10 or more, carry the ten to the next column.',
  },
  'add.wroteWholeSum': {
    label: 'Wrote the whole sum in one column',
    example: '47 + 38 → 715',
    tip: 'Only one digit fits in each column; carry the ten.',
  },
  wrongOperation: {
    label: 'Used the other operation',
    example: 'Added when the sign said subtract',
    tip: 'Say the sign out loud before starting.',
  },
  offByOne: {
    label: 'Off by one',
    example: 'Counting slip, e.g. 46 instead of 45',
    tip: 'Usually a counting slip: count once more, slowly.',
  },
  offByTen: {
    label: 'Off by ten',
    example: 'Tens slip, e.g. 65 instead of 55',
    tip: 'Check the tens column again.',
  },
}

export const pctText = (p: number | null) => (p === null ? '–' : `${Math.round(p * 100)}%`)

/** "Mon 13" style short label for a local yyyy-mm-dd date. */
export function shortDay(date: string): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'narrow' })
  return `${weekday}${d}`
}
