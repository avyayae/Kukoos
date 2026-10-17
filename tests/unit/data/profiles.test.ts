import { describe, expect, it } from 'vitest'
import { createDexieRepositories, DEFAULT_PROFILE, GLOBAL } from '@/data/repositories/dexie'
import { freshDb } from './testDb'

describe('profiles.ensureCurrent (AC2)', () => {
  it('creates the default profile and global settings on first launch', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, () => 5000)
    const profile = await repos.profiles.ensureCurrent()
    expect(profile).toMatchObject({
      nickname: DEFAULT_PROFILE.nickname,
      grade: 2,
      createdAt: 5000,
      version: 1,
    })
    expect(profile?.profileId).toBe(profile?.id)
    expect(await db.profiles.count()).toBe(1)
    expect(await db.settings.get(GLOBAL)).toMatchObject({ currentProfileId: profile?.id })
  })

  it('returns the same profile afterwards, even when called concurrently', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    const [a, b] = await Promise.all([
      repos.profiles.ensureCurrent(),
      repos.profiles.ensureCurrent(),
    ])
    const c = await repos.profiles.ensureCurrent()
    expect(a?.id).toBe(b?.id)
    expect(c?.id).toBe(a?.id)
    expect(await db.profiles.count()).toBe(1)
  })
})
