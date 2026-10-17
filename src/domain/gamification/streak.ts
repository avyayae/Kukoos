import { addDays, daysBetween, type LocalDate } from './dates'

/** Totals per kid (stored as the `wallet` row). */
export interface Wallet {
  xpTotal: number
  level: number
  gems: number
  streakCount: number
  streakFreezes: number
  /**
   * The last date the streak covers: the last goal-met day, or yesterday after a freeze
   * filled the gap. `null` before the first goal.
   */
  lastGoalMetDate: LocalDate | null
}

export const NEW_WALLET: Wallet = {
  xpTotal: 0,
  level: 1,
  gems: 0,
  streakCount: 0,
  streakFreezes: 0,
  lastGoalMetDate: null,
}

export const STREAK_RULES = {
  freezeEvery: 7,
  maxFreezes: 2,
  milestones: [3, 7, 14, 30, 50, 100],
} as const

export type StreakRoll =
  { kind: 'none' } | { kind: 'frozen'; used: number } | { kind: 'reset'; lost: number }

/**
 * Settles missed days when the app opens (spec 008 AC3). Freezes fill the gap if there are
 * enough; otherwise the streak starts over. Idempotent for the same `today`.
 */
export function rollStreak(wallet: Wallet, today: LocalDate): { wallet: Wallet; roll: StreakRoll } {
  const last = wallet.lastGoalMetDate
  if (!last || wallet.streakCount === 0) return { wallet, roll: { kind: 'none' } }
  const missed = daysBetween(last, today) - 1
  if (missed <= 0) return { wallet, roll: { kind: 'none' } }
  if (wallet.streakFreezes >= missed) {
    return {
      wallet: {
        ...wallet,
        streakFreezes: wallet.streakFreezes - missed,
        lastGoalMetDate: addDays(today, -1),
      },
      roll: { kind: 'frozen', used: missed },
    }
  }
  return {
    wallet: { ...wallet, streakCount: 0 },
    roll: { kind: 'reset', lost: wallet.streakCount },
  }
}

export interface GoalOutcome {
  wallet: Wallet
  roll: StreakRoll
  /** False when today already counted (never awards twice per date). */
  extended: boolean
  freezeEarned: boolean
  /** The milestone reached today (3, 7, 14, …), if any. */
  milestone: number | null
}

/** Today's goal was met: the streak grows by one, at most once per date. */
export function meetGoal(wallet: Wallet, today: LocalDate): GoalOutcome {
  const rolled = rollStreak(wallet, today)
  const w = rolled.wallet
  const last = w.lastGoalMetDate
  if (last !== null && last >= today) {
    return { wallet: w, roll: rolled.roll, extended: false, freezeEarned: false, milestone: null }
  }
  const streakCount = last === addDays(today, -1) && w.streakCount > 0 ? w.streakCount + 1 : 1
  const freezeEarned =
    streakCount % STREAK_RULES.freezeEvery === 0 && w.streakFreezes < STREAK_RULES.maxFreezes
  const milestone = (STREAK_RULES.milestones as readonly number[]).includes(streakCount)
    ? streakCount
    : null
  return {
    wallet: {
      ...w,
      streakCount,
      streakFreezes: w.streakFreezes + (freezeEarned ? 1 : 0),
      lastGoalMetDate: today,
    },
    roll: rolled.roll,
    extended: true,
    freezeEarned,
    milestone,
  }
}
