import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { freshDb } from './testDb'

const at = () => Date.UTC(2026, 9, 19, 15)

describe('course data (spec 013 AC2)', () => {
  it('older profiles, settings and days load as math-only with no chess time', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, at)
    const kid = await repos.profiles.ensureCurrent()
    const id = kid?.id ?? ''
    expect(kid?.courses).toBeUndefined()
    expect(await repos.time.settings(id)).toMatchObject({ chessLimitMin: null })
    await repos.time.addActive(id, 60, 60)
    expect(await repos.time.today(id)).toMatchObject({
      lessonSeconds: 60,
      totalSeconds: 60,
      chessSeconds: 0,
    })
  })

  it('saves courses, the current course, chess time and the chess limit', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, at)
    const id = (await repos.profiles.ensureCurrent())?.id ?? ''
    await repos.profiles.update(id, { courses: ['math', 'chess'], currentCourse: 'chess' })
    expect((await repos.profiles.list())[0]).toMatchObject({
      courses: ['math', 'chess'],
      currentCourse: 'chess',
    })

    await repos.time.addActive(id, 30, 30)
    const today = await repos.time.addChess(id, 45)
    expect(today).toMatchObject({ lessonSeconds: 30, totalSeconds: 30, chessSeconds: 45 })

    await repos.time.setSettings(id, { goalMin: 10, limitMin: 60, chessLimitMin: 20 })
    expect(await repos.time.settings(id)).toEqual({
      goalMin: 10,
      limitMin: 60,
      chessLimitMin: 20,
      spanishLimitMin: null,
    })
  })

  it('records Spanish time and the Spanish limit on their own (spec 018 AC6)', async () => {
    const repos = createDexieRepositories(freshDb(), at)
    const id = (await repos.profiles.ensureCurrent())?.id ?? ''
    expect(await repos.time.today(id)).toMatchObject({ spanishSeconds: 0 })
    await repos.time.addChess(id, 10)
    const today = await repos.time.addSpanish(id, 75)
    expect(today).toMatchObject({
      lessonSeconds: 0,
      totalSeconds: 0,
      chessSeconds: 10,
      spanishSeconds: 75,
    })
    const settings = await repos.time.settings(id)
    expect(settings.spanishLimitMin).toBeNull()
    await repos.time.setSettings(id, { ...settings, spanishLimitMin: 15 })
    expect(await repos.time.settings(id)).toMatchObject({
      spanishLimitMin: 15,
      chessLimitMin: null,
    })
  })

  it('backups carry the new fields', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, at)
    const id = (await repos.profiles.ensureCurrent())?.id ?? ''
    await repos.profiles.update(id, { courses: ['chess'], currentCourse: 'chess' })
    await repos.time.addChess(id, 120)
    const json = JSON.stringify(await repos.backup.export())

    const other = createDexieRepositories(freshDb(), at)
    expect((await other.backup.import(json)).ok).toBe(true)
    expect((await other.profiles.list())[0]).toMatchObject({ courses: ['chess'] })
    expect(await other.time.today(id)).toMatchObject({ chessSeconds: 120 })
  })
})
