import { type KukoosDb, SCHEMA_VERSION } from './db'
import type { BackupFile, ImportResult } from './repositories/types'
import { SYNC_TABLES, TABLES, type TableName } from './rows'

export const BACKUP_ERRORS = {
  notBackup: "This doesn't look like a Kukoos backup file.",
  newer: 'This backup is from a newer version of Kukoos. Please update the app first.',
  damaged: "This backup file is damaged, so it can't be used.",
} as const

export async function tableCounts(db: KukoosDb): Promise<Record<TableName, number>> {
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, await db.table(t).count()] as const),
  )
  return Object.fromEntries(entries) as Record<TableName, number>
}

/** Everything on this device as one JSON-able object (spec 004 AC7). */
export async function exportBackup(db: KukoosDb, now: () => number): Promise<BackupFile> {
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, await db.table(t).toArray()] as const),
  )
  return {
    app: 'kukoos',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now()).toISOString(),
    tables: Object.fromEntries(entries) as BackupFile['tables'],
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isSyncRow = (row: unknown) =>
  isObject(row) &&
  typeof row.id === 'string' &&
  typeof row.profileId === 'string' &&
  typeof row.updatedAt === 'number' &&
  typeof row.version === 'number'

const isOutboxRow = (row: unknown) =>
  isObject(row) && typeof row.id === 'string' && typeof row.rowId === 'string'

export type Validation = { ok: true; file: BackupFile } | { ok: false; error: string }

/** Checks a parsed (or raw JSON text) backup before anything is touched (AC8). */
export function validateBackup(input: unknown): Validation {
  let file: unknown = input
  if (typeof input === 'string') {
    try {
      file = JSON.parse(input)
    } catch {
      return { ok: false, error: BACKUP_ERRORS.notBackup }
    }
  }
  if (!isObject(file) || file.app !== 'kukoos') return { ok: false, error: BACKUP_ERRORS.notBackup }
  const version = file.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: BACKUP_ERRORS.damaged }
  }
  if (version > SCHEMA_VERSION) return { ok: false, error: BACKUP_ERRORS.newer }
  const tables = file.tables
  if (!isObject(tables)) return { ok: false, error: BACKUP_ERRORS.damaged }
  for (const t of TABLES) {
    const rows = tables[t]
    if (!Array.isArray(rows)) return { ok: false, error: BACKUP_ERRORS.damaged }
    const valid = (SYNC_TABLES as readonly string[]).includes(t) ? isSyncRow : isOutboxRow
    if (!rows.every(valid)) return { ok: false, error: BACKUP_ERRORS.damaged }
  }
  return { ok: true, file: file as unknown as BackupFile }
}

/** Replaces all data on this device with the backup, atomically (AC7, AC8). */
export async function importBackup(db: KukoosDb, input: unknown): Promise<ImportResult> {
  const checked = validateBackup(input)
  if (!checked.ok) return checked
  const { tables } = checked.file
  await db.transaction('rw', db.tables, async () => {
    for (const t of TABLES) {
      const table = db.table(t)
      await table.clear()
      await table.bulkPut(tables[t] as unknown[])
    }
  })
  return { ok: true, counts: await tableCounts(db) }
}
