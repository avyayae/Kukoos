import Dexie, { type EntityTable } from 'dexie'
import type {
  AttemptRow,
  BadgeRow,
  DailyActivityRow,
  GameRow,
  InventoryRow,
  LessonRow,
  OutboxRow,
  ProfileRow,
  SettingsRow,
  SkillProgressRow,
  TableName,
  WalletRow,
} from './rows'

export const DB_NAME = 'kukoos'

/**
 * Current schema version. To change the schema later:
 *   1. bump SCHEMA_VERSION
 *   2. add `this.version(N).stores({ …changed tables… }).upgrade(tx => …)` below; never edit old versions
 *   3. add a migration test that opens a vN-1 database and checks the upgrade
 * Backups record the schema version; import refuses files from a newer version.
 */
export const SCHEMA_VERSION = 2

/** Index definitions per table (first entry = primary key). */
export const STORES_V1: Record<Exclude<TableName, 'games'>, string> = {
  profiles: 'id',
  settings: 'id',
  lessons: 'id, profileId, [profileId+skillId], [profileId+endedAt]',
  attempts: 'id, lessonId, [profileId+skillId], [profileId+at]',
  skillProgress: 'id, [profileId+skillId], [profileId+nextReviewAt]',
  wallet: 'id, profileId',
  inventory: 'id, profileId',
  badges: 'id, [profileId+badgeId]',
  dailyActivity: 'id, [profileId+date]',
  outbox: 'id, at',
}

/** v2 (spec 017): games against Kukoos. Only the new table; no existing row changes. */
export const STORES_V2 = { games: 'id, profileId, [profileId+endedAt]' } as const

/** The first schema version each table exists in (backups from before it have none). */
export const TABLE_SINCE: Partial<Record<TableName, number>> = { games: 2 }

export class KukoosDb extends Dexie {
  declare profiles: EntityTable<ProfileRow, 'id'>
  declare settings: EntityTable<SettingsRow, 'id'>
  declare lessons: EntityTable<LessonRow, 'id'>
  declare attempts: EntityTable<AttemptRow, 'id'>
  declare skillProgress: EntityTable<SkillProgressRow, 'id'>
  declare wallet: EntityTable<WalletRow, 'id'>
  declare inventory: EntityTable<InventoryRow, 'id'>
  declare badges: EntityTable<BadgeRow, 'id'>
  declare dailyActivity: EntityTable<DailyActivityRow, 'id'>
  declare outbox: EntityTable<OutboxRow, 'id'>
  declare games: EntityTable<GameRow, 'id'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores(STORES_V1)
    this.version(2).stores(STORES_V2)
  }
}

export function openDb(name = DB_NAME): KukoosDb {
  return new KukoosDb(name)
}
