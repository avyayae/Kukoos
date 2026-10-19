import {
  DEFAULT_TIME_SETTINGS,
  type DayTime,
  type LocalDate,
  localDate,
  type TimeSettings,
} from '@/domain'
import type { KukoosDb } from './db'
import type { DailyActivityRow } from './rows'
import { writeRows } from './write'

/** Today's active time for one kid (spec 008). */
export interface TodayTime extends DayTime {
  date: LocalDate
  goalMet: boolean
  chessSeconds: number
}

export const dayId = (profileId: string, date: LocalDate) => `${profileId}:${date}`

export const emptyToday = (date: LocalDate): TodayTime => ({
  date,
  lessonSeconds: 0,
  totalSeconds: 0,
  bonusMinutes: 0,
  goalMet: false,
  chessSeconds: 0,
})

const toToday = (date: LocalDate, row: DailyActivityRow | undefined): TodayTime =>
  row
    ? {
        date,
        lessonSeconds: row.lessonSeconds,
        totalSeconds: row.totalSeconds,
        bonusMinutes: row.bonusMinutes,
        goalMet: row.goalMet,
        chessSeconds: row.chessSeconds ?? 0,
      }
    : emptyToday(date)

export async function readToday(db: KukoosDb, profileId: string, at: number): Promise<TodayTime> {
  const date = localDate(at)
  return toToday(date, await db.dailyActivity.get(dayId(profileId, date)))
}

/** Read-modify-write of today's row in one transaction (a tick never undoes `goalMet`). */
export async function updateToday(
  db: KukoosDb,
  profileId: string,
  at: number,
  change: (t: TodayTime) => TodayTime,
): Promise<TodayTime> {
  return db.transaction('rw', [db.dailyActivity, db.outbox], async () => {
    const next = change(await readToday(db, profileId, at))
    const { date, ...rest } = next
    await writeRows(
      db,
      'dailyActivity',
      [{ id: dayId(profileId, date), profileId, date, ...rest }],
      at,
    )
    return next
  })
}

export function addActive(
  db: KukoosDb,
  profileId: string,
  lessonSeconds: number,
  totalSeconds: number,
  at: number,
): Promise<TodayTime> {
  return updateToday(db, profileId, at, (t) => ({
    ...t,
    lessonSeconds: t.lessonSeconds + lessonSeconds,
    totalSeconds: t.totalSeconds + totalSeconds,
  }))
}

/** Chess time (spec 013): only `chessSeconds` grows; the goal and the math limit don't. */
export function addChess(
  db: KukoosDb,
  profileId: string,
  seconds: number,
  at: number,
): Promise<TodayTime> {
  return updateToday(db, profileId, at, (t) => ({ ...t, chessSeconds: t.chessSeconds + seconds }))
}

export function addBonus(
  db: KukoosDb,
  profileId: string,
  minutes: number,
  at: number,
): Promise<TodayTime> {
  return updateToday(db, profileId, at, (t) => ({ ...t, bonusMinutes: t.bonusMinutes + minutes }))
}

export async function timeSettings(db: KukoosDb, profileId: string): Promise<TimeSettings> {
  const row = await db.settings.get(profileId)
  return {
    goalMin: row?.dailyGoalMin ?? DEFAULT_TIME_SETTINGS.goalMin,
    limitMin: row?.dailyLimitMin === undefined ? DEFAULT_TIME_SETTINGS.limitMin : row.dailyLimitMin,
    chessLimitMin: row?.chessLimitMin ?? null,
  }
}

export async function saveTimeSettings(
  db: KukoosDb,
  profileId: string,
  settings: TimeSettings,
  at: number,
): Promise<void> {
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    const row = await db.settings.get(profileId)
    await writeRows(
      db,
      'settings',
      [
        {
          ...row,
          id: profileId,
          profileId,
          dailyGoalMin: settings.goalMin,
          dailyLimitMin: settings.limitMin,
          chessLimitMin: settings.chessLimitMin ?? null,
        },
      ],
      at,
    )
  })
}
