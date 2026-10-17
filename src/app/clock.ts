/**
 * "Now" for screens that depend on dates (due reviews). `?now=<ms>` overrides the clock in
 * dev and e2e builds only (`vite build --mode e2e` sets VITE_E2E), so tests can make
 * reviews due; production builds always use the real clock (spec 006 plan).
 */
export const TEST_CLOCK_ENABLED = import.meta.env.DEV || import.meta.env.VITE_E2E === '1'

export function clockNow(params: URLSearchParams, real: () => number = Date.now): number {
  if (TEST_CLOCK_ENABLED) {
    const raw = params.get('now')
    const n = Number(raw)
    if (raw !== null && Number.isSafeInteger(n) && n > 0) return n
  }
  return real()
}
