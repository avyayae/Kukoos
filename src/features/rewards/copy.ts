import { getBadge, type RewardEffect } from '@/domain'

/** Kid-facing reward copy (spec 008). Short, gentle, never guilt. */
export const REWARD_COPY = {
  headsUp: '2 more minutes of space travel today!',
  goodnightTitle: 'Great job today!',
  goodnightBody: 'Kukoos is going to sleep. See you tomorrow!',
  chessOffer: 'Math is sleeping. Want to play chess?',
  frozen: 'Kukoos kept your flame warm!',
  newFlame: "Let's start a new flame today!",
} as const

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export interface MomentCopy {
  emoji: string
  title: string
  body: string
}

/** The full-screen celebration for one effect (xp and gems show on the summary instead). */
export function momentFor(effect: RewardEffect): MomentCopy | null {
  switch (effect.type) {
    case 'chestOpened':
      return {
        emoji: '🎁',
        title: 'Treasure chest!',
        body: `Every answer right on the first try! +${effect.gems} star crystals.`,
      }
    case 'badgeUnlocked': {
      const badge = getBadge(effect.badgeId)
      if (!badge) return null
      return { emoji: badge.emoji, title: `New badge: ${badge.name}!`, body: badge.howTo }
    }
    case 'levelUp':
      return {
        emoji: '⭐',
        title: `Level ${effect.level}!`,
        body: 'You leveled up. Kukoos is so proud!',
      }
    case 'streakFrozen':
      return {
        emoji: '🧊',
        title: REWARD_COPY.frozen,
        body: `A streak freeze saved your flame.`,
      }
    case 'goalMet':
      return {
        emoji: '🎯',
        title: 'Daily goal done!',
        body: `${plural(effect.minutes, 'minute')} of math today. Mission complete!`,
      }
    case 'streakExtended':
      return {
        emoji: effect.milestone ? '🚀' : '🔥',
        title: `${plural(effect.count, 'day')} flame!`,
        body: effect.milestone
          ? 'A new record! Your rocket flies higher.'
          : 'Come back tomorrow to keep it going.',
      }
    case 'freezeEarned':
      return {
        emoji: '🧊',
        title: 'Streak freeze earned!',
        body: 'It keeps your flame safe if you miss a day.',
      }
    case 'xpGained':
    case 'gemsGained':
      return null
  }
}
