/** A device-local calendar date, `yyyy-mm-dd`. Streaks and daily time are keyed by it. */
export type LocalDate = string

const pad = (n: number) => String(n).padStart(2, '0')
const DAY = 86_400_000

/** The device-local calendar date of a moment (the one place local dates are computed). */
export function localDate(ms: number): LocalDate {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toUtc(date: LocalDate): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const d = new Date(toUtc(date) + days * DAY)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Whole calendar days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY)
}
