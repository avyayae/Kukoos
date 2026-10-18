import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import { correctResponse, lessonReducer, startLesson } from '@/domain'
import { freshDb } from './testDb'

function finishedLesson() {
  let s = startLesson({ skillId: 'add.within20', seed: 3, at: 1 })
  while (s.phase !== 'complete') {
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 2 })
    s = lessonReducer(s, { type: 'continue', at: 3 })
  }
  return s
}

describe('profiles (AC5, AC7)', () => {
  it('creates up to 4 kids, renames, sets grade and avatar', async () => {
    const repos = createDexieRepositories(freshDb())
    const first = await repos.profiles.ensureCurrent()
    expect(first).toMatchObject({ nickname: 'Explorer', avatar: null })
    const maya = await repos.profiles.create({ nickname: 'Maya', grade: 3 })
    expect(maya).toMatchObject({ nickname: 'Maya', grade: 3, avatar: null })
    await repos.profiles.create({ nickname: 'Leo', grade: 2 })
    await repos.profiles.create({ nickname: 'Ava', grade: 2 })
    expect(await repos.profiles.create({ nickname: 'Fifth', grade: 2 })).toBeNull()
    expect((await repos.profiles.list()).map((p) => p.nickname)).toEqual([
      'Explorer',
      'Maya',
      'Leo',
      'Ava',
    ])

    await repos.profiles.update(first?.id ?? '', {
      nickname: 'Riya',
      avatar: { skin: 's4', hairStyle: 'buns' },
    })
    expect((await repos.profiles.list())[0]).toMatchObject({
      nickname: 'Riya',
      avatar: { skin: 's4', hairStyle: 'buns' },
      version: 2,
    })
  })

  it('switching the current kid sticks', async () => {
    const repos = createDexieRepositories(freshDb())
    await repos.profiles.ensureCurrent()
    const maya = await repos.profiles.create({ nickname: 'Maya', grade: 3 })
    await repos.profiles.setCurrent(maya?.id ?? '')
    expect((await repos.profiles.ensureCurrent())?.nickname).toBe('Maya')
    await repos.profiles.setCurrent('missing')
    expect((await repos.profiles.ensureCurrent())?.nickname).toBe('Maya')
  })

  it('removing a kid deletes only their data, with outbox deletes, and never the last kid', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    const riya = (await repos.profiles.ensureCurrent())?.id ?? ''
    const maya = (await repos.profiles.create({ nickname: 'Maya', grade: 3 }))?.id ?? ''
    await repos.lessons.save(finishedLesson(), { lessonId: 'R1', profileId: riya })
    await repos.lessons.save(finishedLesson(), { lessonId: 'M1', profileId: maya })
    await repos.time.addActive(maya, 60, 60)
    await repos.time.setSettings(maya, { goalMin: 5, limitMin: 30 })
    await repos.profiles.setCurrent(maya)

    expect(await repos.profiles.remove(maya)).toBe(true)
    for (const table of [
      'lessons',
      'attempts',
      'skillProgress',
      'wallet',
      'badges',
      'dailyActivity',
      'settings',
      'profiles',
    ] as const) {
      const left = await db
        .table(table)
        .filter((r: { profileId: string }) => r.profileId === maya)
        .count()
      expect(left, table).toBe(0)
    }
    expect(await db.lessons.count()).toBe(1)
    expect((await repos.rewards.wallet(riya)).wallet.gems).toBe(20)
    expect(
      await db.outbox
        .where('at')
        .above(0)
        .filter((o) => o.op === 'delete')
        .count(),
    ).toBeGreaterThan(5)
    // The current kid moves to someone who still exists.
    expect((await repos.profiles.ensureCurrent())?.id).toBe(riya)
    expect(await repos.profiles.remove(riya)).toBe(false)
    expect(await repos.profiles.remove('missing')).toBe(false)
  })

  it('the null store has no profiles to manage', async () => {
    const repos = createNullRepositories()
    expect(await repos.profiles.list()).toEqual([])
    expect(await repos.profiles.create({ nickname: 'A', grade: 2 })).toBeNull()
    await expect(repos.profiles.update('x', { nickname: 'B' })).resolves.toBeUndefined()
    await expect(repos.profiles.setCurrent('x')).resolves.toBeUndefined()
    expect(await repos.profiles.remove('x')).toBe(false)
  })
})
