import { createContext, useContext } from 'react'

export interface GrownUpGateState {
  /** True once a grown-up entered the PIN during this visit (spec 011). */
  unlocked: boolean
  unlock: () => void
  /** "Lock": the next visit to Grown-ups asks for the PIN again. */
  lock: () => void
}

export const GrownUpGateContext = createContext<GrownUpGateState | null>(null)

export function useGrownUpGate(): GrownUpGateState {
  const ctx = useContext(GrownUpGateContext)
  if (!ctx) throw new Error('useGrownUpGate must be used inside <GrownUpGateProvider>')
  return ctx
}

/** Wrong PINs allowed before a pause (spec 011 AC3). */
export const MAX_PIN_TRIES = 5
export const PIN_COOLDOWN_MS = 30_000
export const PIN_LENGTH = 4

export interface RecoveryQuestion {
  a: number
  b: number
  answer: number
}

/**
 * "Forgot PIN?" (spec 011 AC4): a 2-digit × 2-digit product to type in, easy for a grown-up
 * with a phone calculator and out of reach for a 7-year-old. `random` is injectable for tests.
 */
export function makeRecoveryQuestion(random: () => number = Math.random): RecoveryQuestion {
  const a = 23 + Math.floor(random() * 67) // 23–89
  const b = 12 + Math.floor(random() * 28) // 12–39
  return { a, b, answer: a * b }
}
