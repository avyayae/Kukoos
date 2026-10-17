// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/domain/curriculum/skills'
import { generateQuestion } from '@/domain/generators/registry'
import { DIFFICULTIES } from '@/domain/types'

// Spec 003 AC7: 10,000 questions across all skills in under a second.
describe('generation performance (AC7)', () => {
  it('generates 10,000 questions in < 1s', () => {
    const combos = SKILLS.flatMap((s) =>
      s.kinds.flatMap((kind) => DIFFICULTIES.map((difficulty) => ({ id: s.id, kind, difficulty }))),
    )
    const start = performance.now()
    for (let i = 0; i < 10_000; i++) {
      const c = combos[i % combos.length] as (typeof combos)[number]
      generateQuestion(c.id, { difficulty: c.difficulty, kind: c.kind, seed: i })
    }
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
