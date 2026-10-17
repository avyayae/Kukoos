import Dexie, { type EntityTable } from 'dexie'
import type {
  AttemptRow,
  BadgeRow,
  DailyActivityRow,
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
export const SCHEMA_VERSION = 1

/** Index definitions per table (first entry = primary key). */
export const STORES_V1: Record<TableName, string> = {
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

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores(STORES_V1)
  }
}

export function openDb(name = DB_NAME): KukoosDb {
  return new KukoosDb(name)
}
