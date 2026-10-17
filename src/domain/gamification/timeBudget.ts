/** Parent-set minutes (spec 008). A `null` limit means "off". */
export const GOAL_OPTIONS = [5, 10, 15, 20] as const
export const LIMIT_OPTIONS = [15, 20, 30, 45, 60] as const
export const DEFAULT_GOAL_MIN = 10
export const DEFAULT_LIMIT_MIN = 60
/** The grown-up "+10 minutes today" grant. */
export const BONUS_MIN = 10
/** The heads-up shows when this much time is left. */
export const WARN_SECONDS = 120

export interface TimeSettings {
  goalMin: number
  limitMin: number | null
}

export const DEFAULT_TIME_SETTINGS: TimeSettings = {
  goalMin: DEFAULT_GOAL_MIN,
  limitMin: DEFAULT_LIMIT_MIN,
}

/** Today's active time. Lesson time fills the goal; all time counts against the limit. */
export interface DayTime {
  lessonSeconds: number
  totalSeconds: number
  bonusMinutes: number
}

export const EMPTY_DAY: DayTime = { lessonSeconds: 0, totalSeconds: 0, bonusMinutes: 0 }

export interface TimeBudget {
  /** 0–1, how full the goal ring is. */
  goalProgress: number
  goalMet: boolean
  /** Seconds left today; `null` when there's no limit. */
  remainingSeconds: number | null
  /** Time is nearly up: show the gentle heads-up. */
  warn: boolean
  /** The limit is reached: new lessons wait until tomorrow (or a grown-up's +10). */
  locked: boolean
}

export function timeBudget(day: DayTime, settings: TimeSettings): TimeBudget {
  const goalSeconds = Math.max(1, settings.goalMin * 60)
  const lesson = Math.max(0, day.lessonSeconds)
  const goalProgress = Math.min(1, lesson / goalSeconds)
  const goalMet = lesson >= goalSeconds
  if (settings.limitMin === null) {
    return { goalProgress, goalMet, remainingSeconds: null, warn: false, locked: false }
  }
  const allowed = (settings.limitMin + Math.max(0, day.bonusMinutes)) * 60
  const remainingSeconds = Math.max(0, allowed - Math.max(0, day.totalSeconds))
  return {
    goalProgress,
    goalMet,
    remainingSeconds,
    warn: remainingSeconds > 0 && remainingSeconds <= WARN_SECONDS,
    locked: remainingSeconds === 0,
  }
}
