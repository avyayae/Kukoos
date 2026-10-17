import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type TodayTime, useCurrentProfile, useRepos } from '@/data'
import {
  BONUS_MIN,
  DEFAULT_TIME_SETTINGS,
  EMPTY_DAY,
  localDate,
  timeBudget,
  type TimeSettings,
} from '@/domain'
import { HeadsUp } from '@/features/rewards/HeadsUp'
import { type Activity, TimeContext, type TimeContextValue } from './time'

/** Ticks count only while the page is visible and the kid touched something this recently. */
export const IDLE_MS = 60_000
export const TICK_MS = 5_000
/** The profile id used when nothing can be saved (the null store keeps time in memory). */
const LOCAL = 'local'

interface TimeProviderProps {
  children: ReactNode
  /** Injectable for tests. */
  now?: () => number
  tickMs?: number
}

/**
 * The active-time tracker (spec 008, architecture §6): one interval for the whole app.
 * Each tick adds `tickMs` of lesson or map time to today's row, so nothing is lost if the
 * tab is killed. The limit is a soft lock: it's a kid app, not DRM.
 */
export function TimeProvider({ children, now = Date.now, tickMs = TICK_MS }: TimeProviderProps) {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const profileId = profile === undefined ? null : (profile?.id ?? LOCAL)
  const [today, setToday] = useState<TodayTime | null>(null)
  const [settings, setSettingsState] = useState<TimeSettings>(DEFAULT_TIME_SETTINGS)
  const [ready, setReady] = useState(false)
  const activity = useRef<Activity | null>(null)
  const lastInput = useRef(now())
  const date = useRef<string | null>(null)

  useEffect(() => {
    if (!profileId) return
    let alive = true
    Promise.all([repos.time.today(profileId), repos.time.settings(profileId)])
      .then(([t, s]) => {
        if (!alive) return
        date.current = t.date
        setToday(t)
        setSettingsState(s)
        setReady(true)
      })
      .catch(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [repos, profileId])

  useEffect(() => {
    const onInput = () => {
      lastInput.current = now()
    }
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    for (const e of events) window.addEventListener(e, onInput, { passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, onInput)
    }
  }, [now])

  useEffect(() => {
    if (!profileId) return
    const store = (t: TodayTime) => {
      date.current = t.date
      setToday(t)
    }
    const id = window.setInterval(() => {
      const at = now()
      // A new day (the tab stayed open overnight): start from today's row.
      if (date.current !== null && date.current !== localDate(at)) {
        void repos.time.today(profileId).then(store)
        return
      }
      const kind = activity.current
      if (!kind || document.visibilityState !== 'visible' || at - lastInput.current >= IDLE_MS)
        return
      const seconds = tickMs / 1000
      void repos.time
        .addActive(profileId, kind === 'lesson' ? seconds : 0, seconds)
        .then(store)
        .catch(() => undefined)
    }, tickMs)
    return () => window.clearInterval(id)
  }, [repos, profileId, now, tickMs])

  const setActivity = useCallback((a: Activity | null) => {
    activity.current = a
  }, [])

  const value = useMemo<TimeContextValue>(
    () => ({
      ready,
      today,
      settings,
      budget: timeBudget(today ?? EMPTY_DAY, settings),
      setActivity,
      grantBonus: async () => {
        if (!profileId) return
        const t = await repos.time.addBonus(profileId, BONUS_MIN)
        date.current = t.date
        setToday(t)
      },
      setSettings: async (s) => {
        if (!profileId) return
        await repos.time.setSettings(profileId, s)
        setSettingsState(s)
      },
    }),
    [ready, today, settings, setActivity, profileId, repos],
  )

  return (
    <TimeContext value={value}>
      {children}
      <HeadsUp
        warn={value.budget.warn}
        dayKey={today ? `${today.date}:${today.bonusMinutes}` : ''}
      />
    </TimeContext>
  )
}
