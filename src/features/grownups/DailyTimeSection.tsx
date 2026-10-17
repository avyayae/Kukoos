import { useDailyTime } from '@/app/time'
import { BONUS_MIN, GOAL_OPTIONS, LIMIT_OPTIONS } from '@/domain'
import { Button3D } from '@/ui'

const OFF = 'off'
const minutes = (seconds: number) => Math.floor(seconds / 60)

/**
 * Daily goal and limit in minutes (spec 008 AC12), today's active time, and the
 * "+10 minutes today" override. Changes apply right away.
 */
export function DailyTimeSection({ onDone }: { onDone: (message: string) => void }) {
  const { settings, setSettings, today, budget, grantBonus } = useDailyTime()
  const lesson = minutes(today?.lessonSeconds ?? 0)
  const total = minutes(today?.totalSeconds ?? 0)
  const left = budget.remainingSeconds === null ? null : Math.ceil(budget.remainingSeconds / 60)

  return (
    <section className="grownup__card" aria-label="Daily time">
      <h2>Daily time</h2>
      <p data-testid="today-minutes">
        Today: {lesson} min in missions, {total} min in the app
        {left === null
          ? '.'
          : budget.locked
            ? '. The daily limit is reached.'
            : `, ${left} min left.`}
      </p>
      <label className="grownup__field">
        <span>Daily goal</span>
        <select
          className="grownup__select"
          value={settings.goalMin}
          onChange={(e) => void setSettings({ ...settings, goalMin: Number(e.target.value) })}
        >
          {GOAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes of missions
            </option>
          ))}
        </select>
      </label>
      <label className="grownup__field">
        <span>Daily limit</span>
        <select
          className="grownup__select"
          value={settings.limitMin ?? OFF}
          onChange={(e) =>
            void setSettings({
              ...settings,
              limitMin: e.target.value === OFF ? null : Number(e.target.value),
            })
          }
        >
          {LIMIT_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes a day
            </option>
          ))}
          <option value={OFF}>No limit</option>
        </select>
      </label>
      <p>Only active time counts: the app pauses when it's hidden or nobody taps for a minute.</p>
      <Button3D
        variant="primary"
        size="md"
        disabled={settings.limitMin === null}
        onClick={() =>
          void grantBonus().then(() => onDone(`Added ${BONUS_MIN} minutes for today.`))
        }
      >
        +{BONUS_MIN} minutes today
      </Button3D>
    </section>
  )
}
