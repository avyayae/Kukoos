import { describe, expect, it } from 'vitest'
import { newId, writeRows } from '@/data/write'
import { freshDb } from './testDb'

const profile = (id: string, nickname = 'Explorer') => ({
  id,
  profileId: id,
  nickname,
  grade: 2 as const,
  avatar: null,
  createdAt: 1,
})

describe('writeRows (AC5)', () => {
  it('stamps sync fields and adds one outbox entry per row', async () => {
    const db = freshDb()
    const id = newId()
    await writeRows(db, 'profiles', [profile(id)], 1000)
    expect(await db.profiles.get(id)).toMatchObject({ id, updatedAt: 1000, version: 1 })
    const outbox = await db.outbox.toArray()
    expect(outbox).toEqual([
      { id: expect.any(String), table: 'profiles', rowId: id, op: 'put', at: 1000 },
    ])
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('bumps version on update', async () => {
    const db = freshDb()
    const id = newId()
    await writeRows(db, 'profiles', [profile(id)], 1000)
    await writeRows(db, 'profiles', [profile(id, 'Riya')], 2000)
    expect(await db.profiles.get(id)).toMatchObject({
      nickname: 'Riya',
      updatedAt: 2000,
      version: 2,
    })
    expect(await db.outbox.count()).toBe(2)
  })

  it('is atomic: a failing write leaves neither rows nor outbox entries', async () => {
    const db = freshDb()
    const id = newId()
    await expect(
      db.transaction('rw', [db.profiles, db.outbox], async () => {
        await writeRows(db, 'profiles', [profile(id)], 1000)
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await db.profiles.count()).toBe(0)
    expect(await db.outbox.count()).toBe(0)
  })

  it('does nothing for an empty batch', async () => {
    const db = freshDb()
    await writeRows(db, 'profiles', [], 1)
    expect(await db.outbox.count()).toBe(0)
  })
})
