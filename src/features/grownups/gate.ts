import { createContext, useContext } from 'react'

export interface GrownUpGateState {
  /** True once a grown-up answered the gate question during this visit. */
  unlocked: boolean
  unlock: () => void
}

export const GrownUpGateContext = createContext<GrownUpGateState | null>(null)

export function useGrownUpGate(): GrownUpGateState {
  const ctx = useContext(GrownUpGateContext)
  if (!ctx) throw new Error('useGrownUpGate must be used inside <GrownUpGateProvider>')
  return ctx
}

export interface GateQuestion {
  a: number
  b: number
  answer: number
  choices: number[]
}

/**
 * A question most 7-year-olds can't answer yet (2-digit × 1-digit), with 4 choices.
 * `random` is injectable for tests.
 */
export function makeGateQuestion(random: () => number = Math.random): GateQuestion {
  const a = 12 + Math.floor(random() * 8) // 12–19
  const b = 3 + Math.floor(random() * 7) // 3–9
  const answer = a * b
  const pool = [answer + b, answer - b, answer + 10, answer - 10, answer + a]
  const wrong = [...new Set(pool.filter((n) => n > 0 && n !== answer))].slice(0, 3)
  const choices = [answer, ...wrong]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j] as number, choices[i] as number]
  }
  return { a, b, answer, choices }
}
