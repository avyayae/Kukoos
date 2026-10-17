import { describe, expect, it } from 'vitest'
import { equationToSpeech, equationToText, numberToWords, placeWord } from '@/domain/speech'

describe('numberToWords', () => {
  it.each([
    [0, 'zero'],
    [7, 'seven'],
    [13, 'thirteen'],
    [20, 'twenty'],
    [36, 'thirty-six'],
    [99, 'ninety-nine'],
    [100, 'one hundred'],
    [105, 'one hundred five'],
    [340, 'three hundred forty'],
    [403, 'four hundred three'],
    [999, 'nine hundred ninety-nine'],
    [1000, 'one thousand'],
  ])('%i → %s', (n, words) => {
    expect(numberToWords(n)).toBe(words)
  })

  it('produces clean words for every number 0–1000', () => {
    for (let n = 0; n <= 1000; n++) {
      const words = numberToWords(n)
      expect(words).toMatch(/^[a-z]+([ -][a-z]+)*$/)
      expect(words).not.toContain('undefined')
    }
  })

  it('rejects out-of-range and non-integer input', () => {
    expect(() => numberToWords(-1)).toThrow(RangeError)
    expect(() => numberToWords(1001)).toThrow(RangeError)
    expect(() => numberToWords(2.5)).toThrow(RangeError)
  })
})

describe('placeWord', () => {
  it('is singular only for exactly one', () => {
    expect(placeWord('tens', 1)).toBe('ten')
    expect(placeWord('hundreds', 1)).toBe('hundred')
    expect(placeWord('ones', 0)).toBe('ones')
    expect(placeWord('ones', 16)).toBe('ones')
    expect(placeWord('tens', null)).toBe('tens')
  })
})

describe('equation text and speech', () => {
  const eq = { terms: [36, 28], ops: ['-'] as const, result: null }

  it('renders display text with a real minus sign', () => {
    expect(equationToText(eq)).toBe('36 − 28 = ?')
  })

  it('reads equations naturally', () => {
    expect(equationToSpeech(eq)).toBe('thirty-six minus twenty-eight equals what number')
    expect(equationToSpeech({ terms: [300, null, 5], ops: ['+', '+'], result: 345 })).toBe(
      'three hundred plus what number plus five equals three hundred forty-five',
    )
  })
})
