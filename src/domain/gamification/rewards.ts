import { type BadgeStats, newBadges } from './badges'
import type { LocalDate } from './dates'
import { meetGoal, rollStreak, type Wallet } from './streak'
import { GEM_RULES, isPerfect, lessonGems, lessonXp, levelFor, type LessonSummary } from './xp'

/**
 * What the UI celebrates, one at a time, in this order (architecture §5). The order of the
 * array returned by `lessonRewards` is the play order.
 */
export type RewardEffect =
  | { type: 'xpGained'; amount: number; total: number }
  | { type: 'chestOpened'; gems: number }
  | { type: 'gemsGained'; amount: number; total: number }
  | { type: 'badgeUnlocked'; badgeId: string }
  | { type: 'levelUp'; level: number }
  | { type: 'streakFrozen'; used: number }
  | { type: 'goalMet'; minutes: number }
  | { type: 'streakExtended'; count: number; milestone: boolean }
  | { type: 'freezeEarned'; freezes: number }

export type RewardEffectType = RewardEffect['type']

/** Sound keys per effect (the sounds themselves arrive in F09). */
export const EFFECT_SOUNDS: Record<RewardEffectType, string> = {
  xpGained: 'xp',
  chestOpened: 'chest',
  gemsGained: 'gems',
  badgeUnlocked: 'badge',
  levelUp: 'levelUp',
  streakFrozen: 'freeze',
  goalMet: 'goal',
  streakExtended: 'streak',
  freezeEarned: 'freeze',
}

export interface LessonRewardsInput {
  summary: LessonSummary
  wallet: Wallet
  today: LocalDate
  /** Today's lesson time just reached the goal (and today wasn't marked yet). */
  goalJustMet: boolean
  goalMin: number
  /** Totals including this lesson; `streak` is filled in after the goal is applied. */
  stats: Omit<BadgeStats, 'streak'>
  ownedBadges: ReadonlySet<string>
}

export interface LessonRewards {
  wallet: Wallet
  newBadges: string[]
  effects: RewardEffect[]
}

/** Lesson saved → new totals and the celebrations to play (spec 008 AC1–AC4, AC9). */
export function lessonRewards(input: LessonRewardsInput): LessonRewards {
  const { summary, today } = input
  const effects: RewardEffect[] = []
  const rolled = rollStreak(input.wallet, today)
  let wallet = rolled.wallet

  const xp = lessonXp(summary)
  const lessonCrystals = lessonGems(summary)

  let goal: ReturnType<typeof meetGoal> | null = null
  if (input.goalJustMet) {
    goal = meetGoal(wallet, today)
    wallet = goal.wallet
  }

  const badges = newBadges({ ...input.stats, streak: wallet.streakCount }, input.ownedBadges)
  const gems = lessonCrystals + badges.length * GEM_RULES.badge
  const xpTotal = wallet.xpTotal + xp
  const level = Math.max(wallet.level, levelFor(xpTotal))
  const leveledUp = level > wallet.level
  wallet = { ...wallet, xpTotal, level, gems: wallet.gems + gems }

  if (xp > 0) effects.push({ type: 'xpGained', amount: xp, total: xpTotal })
  if (isPerfect(summary)) effects.push({ type: 'chestOpened', gems: GEM_RULES.chest })
  if (gems > 0) effects.push({ type: 'gemsGained', amount: gems, total: wallet.gems })
  for (const b of badges) effects.push({ type: 'badgeUnlocked', badgeId: b.id })
  if (leveledUp) effects.push({ type: 'levelUp', level })
  if (rolled.roll.kind === 'frozen') effects.push({ type: 'streakFrozen', used: rolled.roll.used })
  if (goal) {
    effects.push({ type: 'goalMet', minutes: input.goalMin })
    if (goal.extended) {
      effects.push({
        type: 'streakExtended',
        count: wallet.streakCount,
        milestone: goal.milestone !== null,
      })
    }
    if (goal.freezeEarned) effects.push({ type: 'freezeEarned', freezes: wallet.streakFreezes })
  }

  return { wallet, newBadges: badges.map((b) => b.id), effects }
}
