import type { LessonState, SkillId } from '@/domain'
import type { LessonMeta } from '../mappers'
import type { ProfileRow, RowsByTable, TableName } from '../rows'

export interface BackupFile {
  app: 'kukoos'
  schemaVersion: number
  exportedAt: string
  tables: { [T in TableName]: T extends keyof RowsByTable ? RowsByTable[T][] : unknown[] }
}

export type ImportResult =
  { ok: true; counts: Record<TableName, number> } | { ok: false; error: string }

/**
 * Everything the UI may do with stored data (spec 004). UI code depends on this
 * interface only — Dexie, a null store (no IndexedDB) and Phase 2 sync can sit behind it.
 */
export interface Repositories {
  /** False when progress can't be saved in this browser. */
  available: boolean
  profiles: {
    /** The current profile, creating the default one on first launch. */
    ensureCurrent(): Promise<ProfileRow | null>
  }
  lessons: {
    /** Saves a finished or exited lesson once; no-op when nothing was answered. */
    save(state: LessonState, meta: LessonMeta): Promise<void>
    /** Best first-try score (0–100) of completed lessons per skill. */
    bestFirstTryBySkill(profileId: string): Promise<Partial<Record<SkillId, number>>>
  }
  backup: {
    export(): Promise<BackupFile>
    import(file: unknown): Promise<ImportResult>
    counts(): Promise<Record<TableName, number>>
  }
  storage: {
    /** Asks the browser to keep our data (once per device). */
    requestPersistence(): Promise<boolean>
    isPersisted(): Promise<boolean | null>
  }
}
