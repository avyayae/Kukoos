import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { DB_NAME, KukoosDb, SCHEMA_VERSION, STORES_V1 } from '@/data/db'
import type { SavedGame } from '@/data/games'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import { freshDb } from './testDb'

const T0 = new Date(2026, 10, 3, 17, 0).getTime()

function store() {
  let at = T0
  const db = freshDb()
  return { db, repos: createDexieRepositories(db, () => at), tick: () => (at += 1000) }
}

function game(patch: Partial<SavedGame> = {}): SavedGame {
  return {
    id: 'g1',
    profileId: 'kid',
    opponent: 'bot:1',
    kidColor: 'w',
    startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves: ['e2e4', 'e7e5'],
    kidMoves: 1,
    result: null,
    startedAt: T0,
    endedAt: null,
    ...patch,
  }
}

describe('saved games (spec 017 AC7)', () => {
  it('saves after every move and resumes the unfinished game', async () => {
    const { repos, tick } = store()
    expect(await repos.games.unfinished('kid')).toBeNull()
    await repos.games.save(game())
    tick()
    await repos.games.save(game({ moves: ['e2e4', 'e7e5', 'g1f3'], kidMoves: 2 }))
    const open = await repos.games.unfinished('kid')
    expect(open).toMatchObject({ id: 'g1', moves: ['e2e4', 'e7e5', 'g1f3'], version: 2 })
    expect(await repos.games.unfinished('other kid')).toBeNull()
  })

  it('a new game stops the old one (one unfinished game per kid)', async () => {
    const { repos, db, tick } = store()
    await repos.games.save(game())
    tick()
    await repos.games.save(game({ id: 'g2', opponent: 'bot:3', moves: [] }))
    expect((await repos.games.unfinished('kid'))?.id).toBe('g2')
    expect(await db.games.get('g1')).toMatchObject({ result: 'ended', endedAt: T0 + 1000 })
  })

  it('finishing saves the result once, with the rewards', async () => {
    const { repos } = store()
    const long = game({ kidMoves: 12 })
    await repos.games.save(long)
    const effects = await repos.games.finish(long, 'win')
    expect(effects.map((e) => e.type)).toEqual(['xpGained', 'gemsGained'])
    expect(await repos.games.finish(long, 'win')).toEqual([])
    expect(await repos.games.unfinished('kid')).toBeNull()
    expect((await repos.rewards.wallet('kid')).wallet).toMatchObject({ xpTotal: 30, gems: 10 })
    // A finished game can't be reopened by a late autosave.
    await repos.games.save(long)
    expect(await repos.games.unfinished('kid')).toBeNull()
  })

  it('crystals only for the first win at each level', async () => {
    const { repos } = store()
    const types = async (id: string, opponent: SavedGame['opponent']) =>
      (await repos.games.finish(game({ id, opponent, kidMoves: 12 }), 'win')).map((e) => e.type)
    expect(await types('a', 'bot:1')).toContain('gemsGained')
    expect(await types('b', 'bot:1')).not.toContain('gemsGained')
    expect(await types('c', 'bot:2')).toContain('gemsGained')
    expect(await repos.games.wins('kid')).toEqual(new Set([1, 2]))
  })

  it('a stopped game earns nothing and is not a win', async () => {
    const { repos } = store()
    expect(await repos.games.finish(game({ kidMoves: 30 }), 'ended')).toEqual([])
    expect(await repos.games.wins('kid')).toEqual(new Set())
  })

  it('reset and remove clear a kid’s games', async () => {
    const { repos } = store()
    const kid = await repos.profiles.create({ nickname: 'Ava', grade: 2 })
    if (!kid) throw new Error('no profile')
    await repos.profiles.create({ nickname: 'Ben', grade: 2 })
    await repos.games.finish(game({ profileId: kid.id, kidMoves: 12 }), 'win')
    expect(await repos.profiles.reset(kid.id)).toBe(true)
    expect(await repos.games.wins(kid.id)).toEqual(new Set())
    await repos.games.save(game({ id: 'g9', profileId: kid.id }))
    expect(await repos.profiles.remove(kid.id)).toBe(true)
    expect(await repos.games.unfinished(kid.id)).toBeNull()
  })

  it('without storage, games play but nothing is saved', async () => {
    const repos = createNullRepositories(() => T0)
    await repos.games.save(game())
    expect(await repos.games.unfinished('kid')).toBeNull()
    expect(await repos.games.finish(game({ kidMoves: 12 }), 'win')).toEqual([])
  })
})

describe('schema v2 migration (spec 017 AC7)', () => {
  it('a v1 database upgrades to v2 and keeps its rows', async () => {
    const name = `kukoos-migration-${Date.now()}`
    const v1 = new Dexie(name)
    v1.version(1).stores(STORES_V1)
    await v1.open()
    await v1.table('profiles').put({
      id: 'kid',
      profileId: 'kid',
      nickname: 'Ava',
      grade: 2,
      avatar: null,
      createdAt: T0,
      updatedAt: T0,
      version: 1,
    })
    v1.close()

    const db = new KukoosDb(name)
    await db.open()
    expect(db.verno).toBe(SCHEMA_VERSION)
    expect(await db.profiles.get('kid')).toMatchObject({ nickname: 'Ava' })
    expect(await db.games.count()).toBe(0)
    db.close()
    expect(DB_NAME).toBe('kukoos')
  })
})
