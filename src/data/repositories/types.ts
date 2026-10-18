import type { AudioPrefs } from '@/audio/prefs'
import type {
  LessonState,
  Progress,
  RewardEffect,
  SkillId,
  StreakRoll,
  TimeSettings,
  Wallet,
  WorldId,
} from '@/domain'
import type { LessonMeta } from '../mappers'
import type { NewProfile, ProfilePatch } from '../profiles'
import type { BadgeRow, ProfileRow, RowsByTable, TableName } from '../rows'
import type { TodayTime } from '../time'

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
    /** All kids on this device, oldest first (spec 010). */
    list(): Promise<ProfileRow[]>
    /** `null` when the device already has the maximum number of kids. */
    create(input: NewProfile): Promise<ProfileRow | null>
    update(id: string, patch: ProfilePatch): Promise<void>
    setCurrent(id: string): Promise<void>
    /** Deletes a kid and all their data; `false` for the last profile. */
    remove(id: string): Promise<boolean>
  }
  lessons: {
    /**
     * Saves a finished or exited lesson once, with its rewards (spec 008), and returns the
     * effects to celebrate. Re-saving, or saving with nothing answered, returns `[]`.
     */
    save(state: LessonState, meta: LessonMeta): Promise<RewardEffect[]>
    /** Best first-try score (0–100) of completed lessons per skill. */
    bestFirstTryBySkill(profileId: string): Promise<Partial<Record<SkillId, number>>>
  }
  progress: {
    /** Mastery per skill for a kid (spec 006). */
    forProfile(profileId: string): Promise<Progress>
    /** Pre-masters the starting point's prerequisites; returns how many skills changed. */
    applyStartingPoint(profileId: string, skillId: SkillId): Promise<number>
  }
  journey: {
    /** Worlds whose boss challenge was passed (spec 007). */
    bossesBeaten(profileId: string): Promise<Set<WorldId>>
    seenWorlds(profileId: string): Promise<WorldId[]>
    markWorldsSeen(profileId: string, worlds: readonly WorldId[]): Promise<void>
  }
  /** Today's active minutes and the parent's daily goal / limit (spec 008). */
  time: {
    today(profileId: string): Promise<TodayTime>
    /** Adds active seconds to today (lesson seconds also count toward the goal). */
    addActive(profileId: string, lessonSeconds: number, totalSeconds: number): Promise<TodayTime>
    /** The grown-up "+10 minutes today". */
    addBonus(profileId: string, minutes: number): Promise<TodayTime>
    settings(profileId: string): Promise<TimeSettings>
    setSettings(profileId: string, settings: TimeSettings): Promise<void>
  }
  rewards: {
    /** XP, crystals and streak, with missed days settled (saved once). */
    wallet(profileId: string): Promise<{ wallet: Wallet; roll: StreakRoll }>
    badges(profileId: string): Promise<BadgeRow[]>
  }
  /** This device's sound and voice settings (spec 009). */
  device: {
    audio(): Promise<AudioPrefs>
    setAudio(prefs: AudioPrefs): Promise<void>
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
