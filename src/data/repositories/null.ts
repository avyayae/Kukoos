import { SCHEMA_VERSION } from '../db'
import { TABLES, type TableName } from '../rows'
import type { BackupFile, Repositories } from './types'

export const NO_STORAGE_MESSAGE = "Progress can't be saved in this browser."

const zeroCounts = () => Object.fromEntries(TABLES.map((t) => [t, 0])) as Record<TableName, number>

/**
 * Used when IndexedDB is unavailable (some private modes, blocked storage): the app
 * still plays, nothing is saved, nothing throws (spec 004 AC10).
 */
export function createNullRepositories(now: () => number = Date.now): Repositories {
  return {
    available: false,
    profiles: { ensureCurrent: () => Promise.resolve(null) },
    lessons: {
      save: () => Promise.resolve(),
      bestFirstTryBySkill: () => Promise.resolve({}),
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
