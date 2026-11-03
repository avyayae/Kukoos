// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { newMastery, type SkillMastery } from '@/domain'
import {
  nextSpanishSkill,
  SPANISH_AREAS,
  SPANISH_SKILLS,
  spanishDue,
  spanishNodes,
  spanishUnlocked,
} from '@/domain/spanish/curriculum'

const doc = readFileSync(
  fileURLToPath(new URL('../../../../specs/06-spanish-skill-map.md', import.meta.url)),
  'utf8',
)

const crowned = (extra: Partial<SkillMastery> = {}): SkillMastery => ({
  ...newMastery(),
  mastery: 0.9,
  crowned: true,
  ...extra,
})

describe('Spanish curriculum (spec 019 AC1)', () => {
  it('matches the skill map: 18 skills, in order, in 3 areas of 6', () => {
    const inDoc = [...doc.matchAll(/^\| `(es\.[A-Za-z0-9]+)` \|/gm)].map((m) => m[1])
    expect(SPANISH_SKILLS.map((s) => s.id)).toEqual(inDoc)
    expect(inDoc).toHaveLength(18)
    expect(SPANISH_AREAS.map((a) => a.id)).toEqual(['harbor', 'market', 'jungle'])
    for (const area of SPANISH_AREAS) {
      expect(SPANISH_SKILLS.filter((s) => s.area === area.id)).toHaveLength(6)
    }
  })

  it('uses count only in the numbers skills, and never scores say', () => {
    for (const s of SPANISH_SKILLS) {
      expect(s.kinds.includes('count')).toBe(s.id.startsWith('es.numbers'))
      expect(s.kinds).toEqual(expect.arrayContaining(['listen', 'see', 'match']))
      expect(s.kinds as readonly string[]).not.toContain('say')
    }
  })

  it('unlocks in order, one crown at a time (spec 019 AC6)', () => {
    expect(spanishUnlocked({})).toEqual(['es.hello'])
    expect(nextSpanishSkill({})).toBe('es.hello')
    const progress = { 'es.hello': crowned() }
    expect(spanishUnlocked(progress)).toEqual(['es.hello', 'es.manners'])
    expect(
      spanishNodes(progress)
        .map((n) => n.state)
        .slice(0, 3),
    ).toEqual(['crowned', 'current', 'locked'])
  })

  it('reviews crowned skills that are due, oldest first', () => {
    const progress = {
      'es.hello': crowned({ nextReviewAt: 200 }),
      'es.manners': crowned({ nextReviewAt: 100 }),
      'es.feelings': crowned({ nextReviewAt: 9_999 }),
    }
    expect(spanishDue(progress, 500)).toEqual(['es.manners', 'es.hello'])
  })
})
