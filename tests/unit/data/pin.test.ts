import { describe, expect, it } from 'vitest'
import { hashPin, isValidPin } from '@/data/pin'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import { freshDb } from './testDb'

describe('grown-up PIN storage (spec 011 AC1)', () => {
  it('stores only a salted hash, and checks the right PIN', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    expect(await repos.device.hasPin()).toBe(false)
    expect(await repos.device.checkPin('1234')).toBe(false)
    await repos.device.setPin('1234')
    expect(await repos.device.hasPin()).toBe(true)
    expect(await repos.device.checkPin('1234')).toBe(true)
    expect(await repos.device.checkPin('4321')).toBe(false)

    const row = await db.settings.get('global')
    expect(row?.pinHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(row)).not.toContain('1234')
    // A backup carries the hash, never the PIN.
    expect(JSON.stringify(await repos.backup.export())).not.toContain('"1234"')
  })

  it('salts per device: the same PIN hashes differently', async () => {
    const a = freshDb()
    const b = freshDb()
    await createDexieRepositories(a).device.setPin('2468')
    await createDexieRepositories(b).device.setPin('2468')
    expect((await a.settings.get('global'))?.pinHash).not.toBe(
      (await b.settings.get('global'))?.pinHash,
    )
    expect(await hashPin('2468', 'salt')).toBe(await hashPin('2468', 'salt'))
  })

  it('only 4 digits make a PIN; the null store keeps it in memory', async () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    await expect(createDexieRepositories(freshDb()).device.setPin('12')).rejects.toThrow()
    const repos = createNullRepositories()
    await repos.device.setPin('1357')
    expect(await repos.device.checkPin('1357')).toBe(true)
  })
})
