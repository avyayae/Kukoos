import type { Equation, Op } from './types'

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const

function below100(n: number): string {
  if (n < 20) return ONES[n] as string
  const tens = TENS[Math.floor(n / 10)] as string
  const ones = n % 10
  return ones === 0 ? tens : `${tens}-${ONES[ones] as string}`
}

/** US English words for 0–1000, as read aloud by TTS: 403 → "four hundred three". */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000) {
    throw new RangeError(`numberToWords supports integers 0–1000, got ${n}`)
  }
  if (n === 1000) return 'one thousand'
  if (n < 100) return below100(n)
  const hundreds = `${ONES[Math.floor(n / 100)] as string} hundred`
  const rest = n % 100
  return rest === 0 ? hundreds : `${hundreds} ${below100(rest)}`
}

export const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−' }
const OP_WORD: Record<Op, string> = { '+': 'plus', '-': 'minus' }

function slotText(slot: number | null): string {
  return slot === null ? '?' : String(slot)
}

function slotWords(slot: number | null): string {
  return slot === null ? 'what number' : numberToWords(slot)
}

function sides(eq: Equation, text: (s: number | null) => string, op: (o: Op) => string): string {
  return eq.terms
    .map((term, i) => (i === 0 ? text(term) : `${op(eq.ops[i - 1] as Op)} ${text(term)}`))
    .join(' ')
}

/** "36 − 28 = ?" */
export function equationToText(eq: Equation): string {
  return `${sides(eq, slotText, (o) => OP_SYMBOL[o])} = ${slotText(eq.result)}`
}

/** "thirty-six minus twenty-eight equals what number" */
export function equationToSpeech(eq: Equation): string {
  return `${sides(eq, slotWords, (o) => OP_WORD[o])} equals ${slotWords(eq.result)}`
}
