import { createContext, useContext, useEffect } from 'react'
import type { TodayTime } from '@/data'
import {
  DEFAULT_TIME_SETTINGS,
  EMPTY_DAY,
  timeBudget,
  type TimeBudget,
  type TimeSettings,
} from '@/domain'

/** What the kid is doing right now. Lesson time fills the goal; both count toward the limit. */
export type Activity = 'lesson' | 'map'

export interface TimeContextValue {
  /** False until today's minutes and the settings have loaded. */
  ready: boolean
  today: TodayTime | null
  settings: TimeSettings
  budget: TimeBudget
  /** Screens declare what counts (see `useActivity`); `null` = nothing counts. */
  setActivity(activity: Activity | null): void
  /** The grown-up "+10 minutes today". */
  grantBonus(): Promise<void>
  setSettings(settings: TimeSettings): Promise<void>
}

const noop = () => Promise.resolve()

export const TimeContext = createContext<TimeContextValue>({
  ready: true,
  today: null,
  settings: DEFAULT_TIME_SETTINGS,
  budget: timeBudget(EMPTY_DAY, DEFAULT_TIME_SETTINGS),
  setActivity: () => undefined,
  grantBonus: noop,
  setSettings: noop,
})

/** Today's minutes, the parent's settings and the goal / limit status (spec 008). */
export function useDailyTime(): TimeContextValue {
  return useContext(TimeContext)
}

/** Counts this screen's active time as `activity` while it's mounted (spec 008 AC6). */
export function useActivity(activity: Activity | null): void {
  const { setActivity } = useContext(TimeContext)
  useEffect(() => {
    setActivity(activity)
    return () => setActivity(null)
  }, [activity, setActivity])
}
