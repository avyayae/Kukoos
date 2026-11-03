import { type TimeBudget, type TimeSettings, type Wallet, xpForLevel } from '@/domain'
import { plural } from './copy'
import { GoalRing } from './GoalRing'

interface TopStatsProps {
  wallet: Wallet
  budget: TimeBudget
  settings: TimeSettings
  lessonSeconds: number
  onSay: (text: string) => void
  /** Untimed courses (chess, spec 013) show only crystals and level: no streak or goal ring. */
  timed?: boolean
}

/**
 * Streak, crystals, goal ring and level (spec 008 AC11). Every chip is tap-to-hear. Its
 * accessible name starts with the visible value (WCAG 2.5.3); the spoken line is friendlier.
 */
export function TopStats({
  wallet,
  budget,
  settings,
  lessonSeconds,
  onSay,
  timed = true,
}: TopStatsProps) {
  const minutes = Math.min(settings.goalMin, Math.floor(lessonSeconds / 60))
  const toNext = xpForLevel(wallet.level + 1) - wallet.xpTotal
  const streak = wallet.streakCount
  const all = [
    {
      key: 'streak',
      icon: '🔥',
      value: String(streak),
      label:
        streak > 0 ? `${streak} day flame` : '0 days. Meet your daily goal to light your flame',
      speech:
        streak > 0
          ? `${plural(streak, 'day')} flame!`
          : 'Meet your daily goal to light your flame!',
    },
    {
      key: 'gems',
      icon: '💎',
      value: String(wallet.gems),
      label: plural(wallet.gems, 'star crystal'),
      speech: plural(wallet.gems, 'star crystal'),
    },
    {
      key: 'goal',
      icon: <GoalRing progress={budget.goalProgress} done={budget.goalMet} />,
      value: budget.goalMet ? 'Done' : `${minutes}/${settings.goalMin}`,
      label: budget.goalMet
        ? 'Done: daily goal met'
        : `${minutes}/${settings.goalMin} minutes of your daily goal`,
      speech: budget.goalMet
        ? 'Daily goal done!'
        : `Daily goal: ${minutes} of ${plural(settings.goalMin, 'minute')}`,
    },
    {
      key: 'level',
      icon: '⭐',
      value: `Lv ${wallet.level}`,
      label: `Lv ${wallet.level}: level ${wallet.level}, ${toNext} XP to level ${wallet.level + 1}`,
      speech: `Level ${wallet.level}. ${toNext} XP to level ${wallet.level + 1}.`,
    },
  ]
  const items = timed ? all : all.filter((item) => item.key === 'gems' || item.key === 'level')
  return (
    <ul className={`top-stats${timed ? '' : ' top-stats--untimed'}`} aria-label="Your stats">
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            className={`top-stats__chip top-stats__chip--${item.key}`}
            aria-label={item.label}
            data-testid={`stat-${item.key}`}
            onClick={() => onSay(item.speech)}
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
