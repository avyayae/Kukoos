import { describe, expect, it } from 'vitest'
import { BACKUP_ERRORS, validateBackup } from '@/data/backup'
import { SCHEMA_VERSION } from '@/data/db'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { TABLES } from '@/data/rows'
import { correctResponse, lessonReducer, startLesson } from '@/domain'
import { freshDb } from './testDb'

async function seeded() {
  const db = freshDb()
  const repos = createDexieRepositories(db, () => Date.UTC(2026, 9, 17))
  const profile = await repos.profiles.ensureCurrent()
  let s = startLesson({ skillId: 'add.within20', seed: 9, at: 0 })
  while (s.phase !== 'complete') {
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
    s = lessonReducer(s, { type: 'continue', at: 2 })
  }
  await repos.lessons.save(s, { lessonId: 'L1', profileId: profile?.id ?? '' })
  return { db, repos }
}

const snapshot = async (db: ReturnType<typeof freshDb>) =>
  Object.fromEntries(
    await Promise.all(TABLES.map(async (t) => [t, await db.table(t).orderBy(':id').toArray()])),
  )

describe('backup export (AC7)', () => {
  it('contains every table, the schema version and a timestamp', async () => {
    const { repos } = await seeded()
    const file = await repos.backup.export()
    expect(file.app).toBe('kukoos')
    expect(file.schemaVersion).toBe(SCHEMA_VERSION)
    expect(file.exportedAt).toBe('2026-10-17T00:00:00.000Z')
    expect(Object.keys(file.tables).sort()).toEqual([...TABLES].sort())
    expect(file.tables.lessons).toHaveLength(1)
    expect(file.tables.attempts).toHaveLength(10)
  })

  it('round-trips losslessly through JSON into an empty device', async () => {
    const { db, repos } = await seeded()
    const json = JSON.stringify(await repos.backup.export())
    const before = await snapshot(db)

    const other = freshDb()
    const otherRepos = createDexieRepositories(other)
    const result = await otherRepos.backup.import(json)
    expect(result.ok).toBe(true)
    expect(await snapshot(other)).toEqual(before)
  })

  it('import replaces whatever was on the device', async () => {
    const { repos } = await seeded()
    const file = await repos.backup.export()
    const target = freshDb()
    const targetRepos = createDexieRepositories(target)
    await targetRepos.profiles.ensureCurrent() // a different profile already here
    await targetRepos.backup.import(file)
    expect(await target.profiles.count()).toBe(1)
    expect((await target.profiles.toArray())[0]?.id).toBe(file.tables.profiles[0]?.id)
    expect(await targetRepos.backup.counts()).toMatchObject({ lessons: 1, attempts: 10 })
  })
})

describe('backup validation (AC8)', () => {
  const valid = async () =>
    (await (await seeded()).repos.backup.export()) as unknown as Record<string, unknown>

  it.each([
    ['malformed JSON', '{not json', BACKUP_ERRORS.notBackup],
    ['another app', { app: 'other' }, BACKUP_ERRORS.notBackup],
    ['an array', [], BACKUP_ERRORS.notBackup],
  ])('rejects %s', (_, input, error) => {
    expect(validateBackup(input)).toEqual({ ok: false, error })
  })

  it('rejects newer schema versions and damaged tables', async () => {
    const file = await valid()
    expect(validateBackup({ ...file, schemaVersion: SCHEMA_VERSION + 1 })).toEqual({
      ok: false,
      error: BACKUP_ERRORS.newer,
    })
    expect(validateBackup({ ...file, schemaVersion: 0 })).toMatchObject({
      error: BACKUP_ERRORS.damaged,
    })
    expect(validateBackup({ ...file, tables: null })).toMatchObject({
      error: BACKUP_ERRORS.damaged,
    })
    const tables = file.tables as Record<string, unknown[]>
    expect(validateBackup({ ...file, tables: { ...tables, lessons: 'nope' } })).toMatchObject({
      error: BACKUP_ERRORS.damaged,
    })
    expect(validateBackup({ ...file, tables: { ...tables, lessons: [{ id: 1 }] } })).toMatchObject({
      error: BACKUP_ERRORS.damaged,
    })
    expect(
      validateBackup({ ...file, tables: { ...tables, outbox: [{ nope: true }] } }),
    ).toMatchObject({ error: BACKUP_ERRORS.damaged })
  })

  it('leaves existing data untouched when a file is rejected', async () => {
    const { db, repos } = await seeded()
    const before = await snapshot(db)
    const result = await repos.backup.import({ app: 'kukoos', schemaVersion: 1, tables: {} })
    expect(result).toEqual({ ok: false, error: BACKUP_ERRORS.damaged })
    expect(await snapshot(db)).toEqual(before)
  })
})
