/** Digits of a non-negative integer, ones first, padded with zeros to `width`. */
export function toDigits(n: number, width = 1): number[] {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`toDigits expects n ≥ 0, got ${n}`)
  const digits: number[] = []
  let rest = n
  do {
    digits.push(rest % 10)
    rest = Math.floor(rest / 10)
  } while (rest > 0)
  while (digits.length < width) digits.push(0)
  return digits
}

/** Inverse of toDigits. Accepts "digits" ≥ 10 (used when simulating bugs). */
export function fromDigits(digits: readonly number[]): number {
  return digits.reduce((sum, d, i) => sum + d * 10 ** i, 0)
}

/** Number of digits in n (0 has 1 digit). */
export function digitCount(n: number): number {
  return toDigits(n).length
}
