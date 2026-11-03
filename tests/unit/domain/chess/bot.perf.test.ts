// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { play, type Position, startPosition, status } from '@/domain/chess'
import { bestMove, chooseMove } from '@/domain/chess/bot'
import { bot } from './botFixtures'

/** 50 middlegames from seeded Playful-vs-Playful games, 12–30 moves in. */
function middlegames(): Position[] {
  const out: Position[] = []
  for (let seed = 1; out.length < 50; seed++) {
    let p = startPosition()
    const plies = 24 + (seed % 37)
    for (let ply = 0; ply < plies && !status(p).over; ply++) {
      p = (play(p, bot(p, 2, seed * 100 + ply)) as { position: Position }).position
    }
    if (!status(p).over) out.push(p)
  }
  return out
}

// Spec 017 AC4: Wise Kukoos answers within 1 s on a mid-range tablet; Node CI gets 1.5 s.
describe('Kukoos thinks fast enough (spec 017 AC4)', () => {
  it('Wise Kukoos and the hint answer each middlegame in ≤ 1.5 s', () => {
    let worst = 0
    for (const [i, p] of middlegames().entries()) {
      for (const think of [() => chooseMove(p, 4, i), () => bestMove(p)]) {
        const t = performance.now()
        think()
        worst = Math.max(worst, performance.now() - t)
      }
    }
    expect(worst).toBeLessThan(1500)
  }, 120_000)
})
