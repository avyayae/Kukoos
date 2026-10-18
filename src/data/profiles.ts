import type { KukoosDb } from './db'
import { type OutboxRow, type ProfileRow, SYNC_TABLES, type SyncTableName } from './rows'
import { newId, writeRows } from './write'

/** At most this many kids on one device (spec 010). */
export const MAX_PROFILES = 4
const GLOBAL = 'global'
const DEVICE = 'device'

export interface NewProfile {
  nickname: string
  grade: 2 | 3
}
export type ProfilePatch = Partial<Pick<ProfileRow, 'nickname' | 'grade' | 'avatar'>>

export async function listProfiles(db: KukoosDb): Promise<ProfileRow[]> {
  return (await db.profiles.toArray()).sort((a, b) => a.createdAt - b.createdAt)
}

/** Adds a kid (avatar `null`, so they build one on first play). `null` when the device is full. */
export async function createProfile(
  db: KukoosDb,
  input: NewProfile,
  at: number,
): Promise<ProfileRow | null> {
  return db.transaction('rw', [db.profiles, db.outbox], async () => {
    if ((await db.profiles.count()) >= MAX_PROFILES) return null
    const id = newId()
    await writeRows(
      db,
      'profiles',
      [
        {
          id,
          profileId: id,
          nickname: input.nickname,
          grade: input.grade,
          avatar: null,
          createdAt: at,
        },
      ],
      at,
    )
    return (await db.profiles.get(id)) ?? null
  })
}

export async function updateProfile(
  db: KukoosDb,
  id: string,
  patch: ProfilePatch,
  at: number,
): Promise<void> {
  await db.transaction('rw', [db.profiles, db.outbox], async () => {
    const row = await db.profiles.get(id)
    if (!row) return
    await writeRows(db, 'profiles', [{ ...row, ...patch }], at)
  })
}

export async function setCurrentProfile(db: KukoosDb, id: string, at: number): Promise<void> {
  await db.transaction('rw', [db.settings, db.profiles, db.outbox], async () => {
    if (!(await db.profiles.get(id))) return
    const global = await db.settings.get(GLOBAL)
    await writeRows(
      db,
      'settings',
      [{ ...global, id: GLOBAL, profileId: DEVICE, currentProfileId: id }],
      at,
    )
  })
}

/**
 * Deletes one kid and everything that belongs to them, in every table, with outbox deletes
 * for sync (spec 010 AC7). Other kids are untouched. The last profile is never removed.
 */
export async function removeProfile(db: KukoosDb, id: string, at: number): Promise<boolean> {
  const tables = [...SYNC_TABLES.map((t) => db.table(t)), db.outbox]
  return db.transaction('rw', tables, async () => {
    const profiles = await listProfiles(db)
    if (profiles.length <= 1 || !profiles.some((p) => p.id === id)) return false
    await deleteRows(db, id, SYNC_TABLES, at)
    const global = await db.settings.get(GLOBAL)
    if (global?.currentProfileId === id) {
      const next = profiles.find((p) => p.id !== id)
      await writeRows(
        db,
        'settings',
        [{ ...global, id: GLOBAL, profileId: DEVICE, currentProfileId: next?.id ?? '' }],
        at,
      )
    }
    return true
  })
}

/** Deletes a kid's rows from the given tables, with outbox deletes for sync. */
async function deleteRows(
  db: KukoosDb,
  profileId: string,
  tables: readonly SyncTableName[],
  at: number,
): Promise<void> {
  const outbox: OutboxRow[] = []
  for (const table of tables) {
    const keys = (await db
      .table(table)
      .filter((row: { profileId: string }) => row.profileId === profileId)
      .primaryKeys()) as string[]
    await db.table(table).bulkDelete(keys)
    for (const rowId of keys) outbox.push({ id: newId(), table, rowId, op: 'delete', at })
  }
  await db.outbox.bulkAdd(outbox)
}

/** Everything a kid has earned or practised; reset clears these (spec 011 AC8). */
const PROGRESS_TABLES: readonly SyncTableName[] = [
  'lessons',
  'attempts',
  'skillProgress',
  'wallet',
  'inventory',
  'badges',
  'dailyActivity',
]

/** "Start over": clears a kid's progress but keeps the kid, the explorer and settings. */
export async function resetProfile(db: KukoosDb, id: string, at: number): Promise<boolean> {
  const tables = [...PROGRESS_TABLES.map((t) => db.table(t)), db.profiles, db.outbox]
  return db.transaction('rw', tables, async () => {
    if (!(await db.profiles.get(id))) return false
    await deleteRows(db, id, PROGRESS_TABLES, at)
    return true
  })
}
