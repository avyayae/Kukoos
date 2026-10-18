import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  AVATAR_CATEGORIES,
  AVATAR_OPTIONS,
  avatarName,
  DEFAULT_AVATAR,
  howToEarn,
  itemUnlocked,
  parseAvatar,
  randomAvatar,
  type UnlockState,
} from '@/domain/avatar'

const fresh: UnlockState = { level: 1, badges: new Set(), bossesBeaten: 0 }
const veteran: UnlockState = { level: 5, badges: new Set(['astronaut']), bossesBeaten: 1 }

describe('avatar model (AC1)', () => {
  it('parses stored avatars, falling back per part', () => {
    expect(parseAvatar(null)).toEqual(DEFAULT_AVATAR)
    expect(parseAvatar('nope')).toEqual(DEFAULT_AVATAR)
    expect(parseAvatar({ hat: 'crown', hairStyle: 'mohawk', skin: 's6', extra: 42 })).toEqual({
      ...DEFAULT_AVATAR,
      hat: 'crown',
      skin: 's6',
    })
  })

  it('earned items unlock with progress, never purchases', () => {
    expect(itemUnlocked('hat', 'crown', fresh)).toBe(false)
    expect(itemUnlocked('hat', 'crown', { ...fresh, level: 5 })).toBe(true)
    expect(itemUnlocked('extra', 'cape', fresh)).toBe(false)
    expect(itemUnlocked('extra', 'cape', { ...fresh, badges: new Set(['astronaut']) })).toBe(true)
    expect(itemUnlocked('extra', 'jetpack', fresh)).toBe(false)
    expect(itemUnlocked('extra', 'jetpack', { ...fresh, bossesBeaten: 1 })).toBe(true)
    expect(itemUnlocked('hat', 'helmet', fresh)).toBe(true)
    expect(howToEarn('hat', 'crown')).toBe('Get to level 5.')
    expect(howToEarn('hat', 'beanie')).toBeNull()
  })

  it('"Surprise me" is seeded and only picks unlocked items', () => {
    expect(randomAvatar(7, fresh)).toEqual(randomAvatar(7, fresh))
    fc.assert(
      fc.property(fc.nat(), (seed) => {
        const a = randomAvatar(seed, fresh)
        expect(a.hat).not.toBe('crown')
        expect(['cape', 'jetpack']).not.toContain(a.extra)
        for (const c of AVATAR_CATEGORIES) expect(AVATAR_OPTIONS[c]).toContain(a[c])
      }),
    )
    const seen = new Set(Array.from({ length: 200 }, (_, s) => randomAvatar(s, veteran).hat))
    expect(seen.has('crown')).toBe(true)
  })

  it('describes the look in words', () => {
    expect(avatarName(DEFAULT_AVATAR)).toBe('Explorer with curly hair')
    expect(avatarName({ ...DEFAULT_AVATAR, hat: 'helmet' })).toBe(
      'Explorer with curly hair and a space helmet',
    )
    expect(avatarName({ ...DEFAULT_AVATAR, hairStyle: 'buns', hat: 'crown', extra: 'cape' })).toBe(
      'Explorer with two buns, a crown and a star cape',
    )
  })
})
