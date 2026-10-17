import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '@/data/db'
import { TABLES } from '@/data/rows'
import { freshDb } from './testDb'

describe('database schema (AC1)', () => {
  it('opens with all 10 tables at the current schema version', async () => {
    const db = freshDb()
    await db.open()
    expect(db.verno).toBe(SCHEMA_VERSION)
    expect(db.tables.map((t) => t.name).sort()).toEqual([...TABLES].sort())
    db.close()
  })

  it('has the indexes later features query by', async () => {
    const db = freshDb()
    await db.open()
    const indexes = (table: string) => db.table(table).schema.indexes.map((i) => i.name)
    expect(indexes('lessons')).toEqual(
      expect.arrayContaining(['profileId', '[profileId+skillId]', '[profileId+endedAt]']),
    )
    expect(indexes('attempts')).toEqual(
      expect.arrayContaining(['lessonId', '[profileId+skillId]', '[profileId+at]']),
    )
    expect(indexes('skillProgress')).toEqual(
      expect.arrayContaining(['[profileId+skillId]', '[profileId+nextReviewAt]']),
    )
    expect(indexes('dailyActivity')).toContain('[profileId+date]')
    db.close()
  })
})
