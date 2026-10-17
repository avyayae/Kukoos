import { describe, expect, it } from 'vitest'
import { SKILLS } from '@/domain/curriculum/skills'
import {
  getSkill,
  skillsInWorld,
  unlockedSkills,
  validateCurriculum,
} from '@/domain/curriculum/skillGraph'
import { WORLDS } from '@/domain/curriculum/worlds'
import type { Skill } from '@/domain/types'

describe('curriculum data (AC1)', () => {
  it('has the 23 MVP skills across 5 worlds', () => {
    expect(SKILLS).toHaveLength(23)
    expect(WORLDS.map((w) => w.id)).toEqual(['jungle', 'savanna', 'ocean', 'moon', 'mars'])
    expect(WORLDS.map((w) => skillsInWorld(w.id).length)).toEqual([4, 4, 5, 4, 6])
  })

  it('is structurally valid', () => {
    expect(validateCurriculum()).toEqual([])
  })

  it('gives every skill a CCSS code in the Grade 2–3 standards', () => {
    for (const s of SKILLS) {
      for (const code of s.ccss) expect(code).toMatch(/^[23]\.(OA|NBT)\.[A-D]\.\d+$/)
    }
  })

  it('numbers each world path 1..n without gaps', () => {
    for (const w of WORLDS) {
      expect(skillsInWorld(w.id).map((s) => s.order)).toEqual(
        Array.from({ length: skillsInWorld(w.id).length }, (_, i) => i + 1),
      )
    }
  })

  it('detects broken data', () => {
    const a = SKILLS[0] as Skill
    const broken: Skill[] = [
      { ...a, id: 'x', prereqs: ['y'], ccss: [] },
      { ...a, id: 'y', prereqs: ['x'], order: 2 },
      { ...a, id: 'z', order: 3, prereqs: ['nope'] },
      { ...a, id: 'z', order: 4, prereqs: [] },
    ]
    const problems = validateCurriculum(broken, WORLDS.slice(0, 1))
    expect(problems.some((p) => p.includes('duplicate skill id z'))).toBe(true)
    expect(problems.some((p) => p.includes('no CCSS code'))).toBe(true)
    expect(problems.some((p) => p.includes('unknown prereq nope'))).toBe(true)
    expect(problems.some((p) => p.startsWith('cycle'))).toBe(true)
  })

  it('rejects a 2-digit skill with a 3-digit-only pattern', () => {
    const a = getSkill('add.within100.regroup')
    const bad: Skill = {
      ...a,
      spec: { type: 'column', op: '+', digits: 2, pattern: 'add.carryBoth' },
    }
    expect(validateCurriculum([bad], WORLDS.slice(1, 2))).toContain(
      'add.within100.regroup: pattern add.carryBoth needs 3 digits',
    )
  })
})

describe('unlockedSkills (AC2)', () => {
  it('starts with only the first jungle skill', () => {
    expect(unlockedSkills(new Set()).map((s) => s.id)).toEqual(['add.within20'])
  })

  it('unlocks skills whose prereqs are all mastered', () => {
    const ids = unlockedSkills(new Set(['add.within20'])).map((s) => s.id)
    expect(ids).toEqual(['add.within20', 'sub.within20', 'add.within100.noregroup'])
  })

  it('needs every prereq, not just one', () => {
    const ids = unlockedSkills(new Set(['add.within20', 'sub.within20'])).map((s) => s.id)
    expect(ids).not.toContain('sub.within100.noregroup')
  })

  it('unlocks everything once everything is mastered', () => {
    const all = new Set(SKILLS.map((s) => s.id))
    expect(unlockedSkills(all)).toHaveLength(SKILLS.length)
  })
})

describe('getSkill', () => {
  it('throws on unknown ids', () => {
    expect(() => getSkill('nope')).toThrow('Unknown skill: nope')
  })
})
