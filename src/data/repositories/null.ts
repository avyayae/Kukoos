import { DEFAULT_TIME_SETTINGS, localDate, NEW_WALLET, type TimeSettings } from '@/domain'
import { SCHEMA_VERSION } from '../db'
import { TABLES, type TableName } from '../rows'
import { emptyToday, type TodayTime } from '../time'
import type { BackupFile, Repositories } from './types'

export const NO_STORAGE_MESSAGE = "Progress can't be saved in this browser."

const zeroCounts = () => Object.fromEntries(TABLES.map((t) => [t, 0])) as Record<TableName, number>

/**
 * Used when IndexedDB is unavailable (some private modes, blocked storage): the app
 * still plays, nothing is saved, nothing throws (spec 004 AC10). Today's minutes are kept
 * in memory so the daily limit still works for this visit (spec 008).
 */
export function createNullRepositories(now: () => number = Date.now): Repositories {
  let today: TodayTime = emptyToday(localDate(now()))
  let settings: TimeSettings = DEFAULT_TIME_SETTINGS
  const current = () => {
    const date = localDate(now())
    if (today.date !== date) today = emptyToday(date)
    return today
  }
  return {
    available: false,
    profiles: { ensureCurrent: () => Promise.resolve(null) },
    lessons: {
      save: () => Promise.resolve([]),
      bestFirstTryBySkill: () => Promise.resolve({}),
    },
    progress: {
      forProfile: () => Promise.resolve({}),
      applyStartingPoint: () => Promise.resolve(0),
    },
    journey: {
      bossesBeaten: () => Promise.resolve(new Set()),
      seenWorlds: () => Promise.resolve([]),
      markWorldsSeen: () => Promise.resolve(),
    },
    time: {
      today: () => Promise.resolve(current()),
      addActive: (_, lessonSeconds, totalSeconds) => {
        const t = current()
        today = {
          ...t,
          lessonSeconds: t.lessonSeconds + lessonSeconds,
          totalSeconds: t.totalSeconds + totalSeconds,
        }
        return Promise.resolve(today)
      },
      addBonus: (_, minutes) => {
        const t = current()
        today = { ...t, bonusMinutes: t.bonusMinutes + minutes }
        return Promise.resolve(today)
      },
      settings: () => Promise.resolve(settings),
      setSettings: (_, s) => {
        settings = s
        return Promise.resolve()
      },
    },
    rewards: {
      wallet: () => Promise.resolve({ wallet: NEW_WALLET, roll: { kind: 'none' } }),
      badges: () => Promise.resolve([]),
    },
    backup: {
      export: () =>
        Promise.resolve({
          app: 'kukoos',
          schemaVersion: SCHEMA_VERSION,
          exportedAt: new Date(now()).toISOString(),
          tables: Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as BackupFile['tables'],
        }),
      import: () => Promise.resolve({ ok: false, error: NO_STORAGE_MESSAGE }),
      counts: () => Promise.resolve(zeroCounts()),
    },
    storage: {
      requestPersistence: () => Promise.resolve(false),
      isPersisted: () => Promise.resolve(null),
    },
  }
}
