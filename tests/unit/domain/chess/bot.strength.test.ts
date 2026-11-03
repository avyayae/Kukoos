// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { matchScore, type Player } from './botFixtures'

// Spec 017 AC2: seeded bot-vs-bot matches, 40 games per pairing with colours alternating.
// About two minutes, so it runs in CI (or with BOT_STRENGTH=1), not in every local run.
const run = !!process.env.CI || !!process.env.BOT_STRENGTH

describe.runIf(run)('each Kukoos is stronger than the one before (spec 017 AC2)', () => {
  const pairs: [Player, Player, string][] = [
    [1, 0, 'Sleepy beats a random mover'],
    [2, 1, 'Playful beats Sleepy'],
    [3, 2, 'Clever beats Playful'],
    [4, 3, 'Wise beats Clever'],
  ]
  it.each(pairs)(
    'level %i vs %i: %s ≥ 70%',
    (a, b) => {
      expect(matchScore(a, b, 40)).toBeGreaterThanOrEqual(0.7)
    },
    600_000,
  )
})
