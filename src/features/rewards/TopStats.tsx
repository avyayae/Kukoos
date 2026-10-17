import { type TimeBudget, type TimeSettings, type Wallet, xpForLevel } from '@/domain'
import { plural } from './copy'
import { GoalRing } from './GoalRing'

interface TopStatsProps {
  wallet: Wallet
  budget: TimeBudget
  settings: TimeSettings
  lessonSeconds: number
  onSay: (text: string) => void
}

/** 🔥 streak · 💎 crystals · goal ring · level (spec 008 AC11). Every chip is tap-to-hear. */
export function TopStats({ wallet, budget, settings, lessonSeconds, onSay }: TopStatsProps) {
  const minutes = Math.min(settings.goalMin, Math.floor(lessonSeconds / 60))
  const toNext = xpForLevel(wallet.level + 1) - wallet.xpTotal
  const items = [
    {
      key: 'streak',
      icon: '🔥',
      value: String(wallet.streakCount),
      label:
        wallet.streakCount > 0
          ? `${plural(wallet.streakCount, 'day')} flame!`
          : 'Meet your daily goal to light your flame!',
    },
    {
      key: 'gems',
      icon: '💎',
      value: String(wallet.gems),
      label: `${plural(wallet.gems, 'star crystal')}`,
    },
    {
      key: 'goal',
      icon: <GoalRing progress={budget.goalProgress} done={budget.goalMet} />,
      value: budget.goalMet ? 'Done' : `${minutes}/${settings.goalMin}`,
      label: budget.goalMet
        ? 'Daily goal done!'
        : `Daily goal: ${minutes} of ${plural(settings.goalMin, 'minute')}`,
    },
    {
      key: 'level',
      icon: '⭐',
      value: `Lv ${wallet.level}`,
      label: `Level ${wallet.level}. ${toNext} XP to level ${wallet.level + 1}.`,
    },
  ]
  return (
    <ul className="top-stats" aria-label="Your stats">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            className={`top-stats__chip top-stats__chip--${item.key}`}
            aria-label={item.label}
            data-testid={`stat-${item.key}`}
            onClick={() => onSay(item.label)}
          >
            <span className="top-stats__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="top-stats__value num" aria-hidden="true">
              {item.value}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
