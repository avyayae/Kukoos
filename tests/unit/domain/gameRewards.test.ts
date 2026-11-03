import { describe, expect, it } from 'vitest'
import { GAME_RULES, gameRewards, type Wallet } from '@/domain'

const wallet: Wallet = {
  xpTotal: 0,
  level: 1,
  gems: 3,
  streakCount: 2,
  streakFreezes: 0,
  lastGoalMetDate: null,
}

// Spec 017 AC6: rewards come from finished games only; chess never touches the streak.
describe('chess game rewards (spec 017 AC6)', () => {
  it('a first win at a level: XP for the game and the win, plus crystals', () => {
    const r = gameRewards({ outcome: 'win', kidMoves: 12, firstWinAtLevel: true, wallet })
    expect(r.effects).toEqual([
      { type: 'xpGained', amount: 30, total: 30 },
      { type: 'gemsGained', amount: GAME_RULES.firstWinGems, total: 13 },
    ])
    expect(r.wallet).toMatchObject({ xpTotal: 30, gems: 13, streakCount: 2 })
  })

  it('a later win earns XP but no crystals', () => {
    const r = gameRewards({ outcome: 'win', kidMoves: 12, firstWinAtLevel: false, wallet })
    expect(r.effects).toEqual([{ type: 'xpGained', amount: 30, total: 30 }])
  })

  it('a finished loss or draw still earns game XP', () => {
    for (const outcome of ['loss', 'draw'] as const) {
      const r = gameRewards({ outcome, kidMoves: 10, firstWinAtLevel: false, wallet })
      expect(r.effects).toEqual([{ type: 'xpGained', amount: 15, total: 15 }])
    }
  })

  it('a stopped game, or a very short one, earns nothing (a quick first win keeps its crystals)', () => {
    expect(gameRewards({ outcome: 'ended', kidMoves: 30, firstWinAtLevel: true, wallet })).toEqual({
      wallet,
      effects: [],
    })
    expect(
      gameRewards({ outcome: 'loss', kidMoves: 9, firstWinAtLevel: false, wallet }).effects,
    ).toEqual([])
    expect(
      gameRewards({ outcome: 'win', kidMoves: 4, firstWinAtLevel: true, wallet }).effects,
    ).toEqual([{ type: 'gemsGained', amount: 10, total: 13 }])
  })

  it('plays a level up when the XP crosses one', () => {
    const near = { ...wallet, xpTotal: 45 }
    const r = gameRewards({ outcome: 'win', kidMoves: 15, firstWinAtLevel: false, wallet: near })
    expect(r.effects.map((e) => e.type)).toEqual(['xpGained', 'levelUp'])
  })
})
