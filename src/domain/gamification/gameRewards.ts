import type { RewardEffect } from './rewards'
import type { Wallet } from './streak'
import { levelFor } from './xp'

/** Chess game rewards (spec 017): earned by finishing real games against Kukoos. */
export const GAME_RULES = { finishedXp: 15, winXp: 15, firstWinGems: 10, minKidMoves: 10 } as const

/** How a game ended for rewards; `ended` = stopped early (never a loss, never a reward). */
export type GameOutcome = 'win' | 'loss' | 'draw' | 'ended'

export interface GameRewardsInput {
  outcome: GameOutcome
  /** Moves the kid made. */
  kidMoves: number
  /** No earlier win at this Kukoos level. */
  firstWinAtLevel: boolean
  wallet: Wallet
}

/**
 * XP for a finished game of at least 10 moves (more for a win), crystals for the first win
 * at each level. No streak, goal or badges: chess is open play (constitution §1.3).
 */
export function gameRewards(input: GameRewardsInput): { wallet: Wallet; effects: RewardEffect[] } {
  const { outcome, wallet } = input
  const win = outcome === 'win'
  const finished = outcome !== 'ended'
  const long = input.kidMoves >= GAME_RULES.minKidMoves
  const xp = finished && long ? GAME_RULES.finishedXp + (win ? GAME_RULES.winXp : 0) : 0
  const gems = win && input.firstWinAtLevel ? GAME_RULES.firstWinGems : 0
  if (xp === 0 && gems === 0) return { wallet, effects: [] }

  const xpTotal = wallet.xpTotal + xp
  const level = Math.max(wallet.level, levelFor(xpTotal))
  const next = { ...wallet, xpTotal, level, gems: wallet.gems + gems }
  const effects: RewardEffect[] = []
  if (xp > 0) effects.push({ type: 'xpGained', amount: xp, total: xpTotal })
  if (gems > 0) effects.push({ type: 'gemsGained', amount: gems, total: next.gems })
  if (level > wallet.level) effects.push({ type: 'levelUp', level })
  return { wallet: next, effects }
}
