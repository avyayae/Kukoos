import type {
  Difficulty,
  LessonMode,
  MisconceptionKey,
  QuestionKind,
  SkillId,
  SrsBox,
  WorldId,
} from '@/domain'

/**
 * Row shapes stored in IndexedDB (spec 004). The same shapes become SQL tables when the
 * Phase 2 .NET sync arrives, so every syncable row carries these fields.
 */
export interface SyncFields {
  /** UUID (crypto.randomUUID). */
  id: string
  profileId: string
  /** ms since epoch, set on every write. */
  updatedAt: number
  /** 1 on insert, +1 on every update (last-writer-wins sync). */
  version: number
}

export interface ProfileRow extends SyncFields {
  nickname: string
  grade: 2 | 3
  avatar: Record<string, string> | null
  createdAt: number
}

/** `id: 'global'` holds device-level settings; per-profile settings use the profile id. */
export interface SettingsRow extends SyncFields {
  currentProfileId?: string
  persistenceRequested?: boolean
  /** Per-profile: worlds whose unlock moment was already shown (spec 007). */
  seenWorlds?: WorldId[]
  /** Per-profile daily goal in minutes (spec 008); absent = default. */
  dailyGoalMin?: number
  /** Per-profile daily limit in minutes; `null` = off, absent = default. */
  dailyLimitMin?: number | null
}

export interface LessonRow extends SyncFields {
  skillId: SkillId
  /** Review mission (spec 006) or boss challenge (spec 007); absent on rows saved before F006. */
  mode?: LessonMode
  /** Boss challenges: the world challenged (spec 007). */
  worldId?: WorldId
  seed: number
  startedAt: number
  endedAt: number
  completed: boolean
  questionCount: number
  firstTryCorrect: number
  bestCombo: number
  durationMs: number
}

/** One row per question outcome in a lesson. */
export interface AttemptRow extends SyncFields {
  lessonId: string
  skillId: SkillId
  questionId: string
  kind: QuestionKind
  difficulty: Difficulty
  firstTry: boolean
  solved: boolean
  attempts: number
  misconceptions: MisconceptionKey[]
  at: number
}

// ---- schema-only tables (written by F06 / F08 / F10)

/** id = `${profileId}:${skillId}` — one row per kid per skill (spec 006). */
export interface SkillProgressRow extends SyncFields {
  skillId: SkillId
  mastery: number
  attempts: number
  sessionsSeen: number
  srsBox: SrsBox
  nextReviewAt: number
  crowned: boolean
  preMastered: boolean
}

export interface WalletRow extends SyncFields {
  xpTotal: number
  level: number
  gems: number
  streakCount: number
  streakFreezes: number
  lastGoalMetDate: string | null
}

export interface InventoryRow extends SyncFields {
  itemId: string
  equipped: boolean
}

export interface BadgeRow extends SyncFields {
  badgeId: string
  unlockedAt: number
}

export interface DailyActivityRow extends SyncFields {
  /** Local calendar date yyyy-mm-dd. */
  date: string
  lessonSeconds: number
  totalSeconds: number
  bonusMinutes: number
  goalMet: boolean
}

export interface OutboxRow {
  id: string
  table: SyncTableName
  rowId: string
  op: 'put' | 'delete'
  at: number
}

export interface RowsByTable {
  profiles: ProfileRow
  settings: SettingsRow
  lessons: LessonRow
  attempts: AttemptRow
  skillProgress: SkillProgressRow
  wallet: WalletRow
  inventory: InventoryRow
  badges: BadgeRow
  dailyActivity: DailyActivityRow
}

export type SyncTableName = keyof RowsByTable
export type TableName = SyncTableName | 'outbox'

export const SYNC_TABLES: readonly SyncTableName[] = [
  'profiles',
  'settings',
  'lessons',
  'attempts',
  'skillProgress',
  'wallet',
  'inventory',
  'badges',
  'dailyActivity',
]
export const TABLES: readonly TableName[] = [...SYNC_TABLES, 'outbox']
