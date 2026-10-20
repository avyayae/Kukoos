import { chessAvailable } from '@/app/courses'
import { useDailyTime } from '@/app/time'
import { BONUS_MIN, CHESS_LIMIT_OPTIONS, GOAL_OPTIONS, LIMIT_OPTIONS } from '@/domain'
import { Button3D } from '@/ui'

const OFF = 'off'
const minutes = (seconds: number) => Math.floor(seconds / 60)

/**
 * Daily goal and limit in minutes (spec 008 AC12), today's active time, and the
 * "+10 minutes today" override. Changes apply right away. With chess on offer these are the
 * math settings, plus the optional chess limit (spec 013: off by default; chess is open play).
 */
export function DailyTimeSection({ onDone }: { onDone: (message: string) => void }) {
  const { settings, setSettings, today, budget, grantBonus } = useDailyTime()
  const lesson = minutes(today?.lessonSeconds ?? 0)
  const total = minutes(today?.totalSeconds ?? 0)
  const left = budget.remainingSeconds === null ? null : Math.ceil(budget.remainingSeconds / 60)
  const withChess = chessAvailable()

  return (
    <section className="grownup__card" aria-label="Daily time">
      <h2>{withChess ? 'Math daily time' : 'Daily time'}</h2>
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
      {withChess && (
        <>
          <h3>Chess</h3>
          <p data-testid="today-chess">
            Today: {minutes(today?.chessSeconds ?? 0)} min of chess. Chess is open play: no goal and
            no streak.
          </p>
          <label className="grownup__field">
            <span>Chess daily limit</span>
            <select
              className="grownup__select"
              value={settings.chessLimitMin ?? OFF}
              onChange={(e) =>
                void setSettings({
                  ...settings,
                  chessLimitMin: e.target.value === OFF ? null : Number(e.target.value),
                })
              }
            >
              <option value={OFF}>No limit</option>
              {CHESS_LIMIT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes a day
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </section>
  )
}
