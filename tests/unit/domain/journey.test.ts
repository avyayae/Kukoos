import { describe, expect, it } from 'vitest'
import { skillsInWorld } from '@/domain/curriculum/skillGraph'
import { SKILLS } from '@/domain/curriculum/skills'
import {
  bossPassed,
  composeBoss,
  isUnlocked,
  type JourneyInput,
  mapNodes,
  nextMission,
  worldCleared,
} from '@/domain/engine/journey'
import { DAY_MS, newMastery, type SkillMastery } from '@/domain/engine/mastery'
import { applyStartingPoint } from '@/domain/engine/startingPoint'
import type { Progress } from '@/domain/engine/lessonComposer'
import type { WorldId } from '@/domain/types'

const NOW = 10 * DAY_MS
const earned = (): SkillMastery => ({
  ...newMastery(),
  mastery: 0.9,
  crowned: true,
  nextReviewAt: NOW + DAY_MS,
})
const input = (progress: Progress, beaten: WorldId[] = []): JourneyInput => ({
  progress,
  bossesBeaten: new Set(beaten),
  now: NOW,
})
const crownWorld = (worldId: WorldId, p: Record<string, SkillMastery> = {}) => {
  for (const s of skillsInWorld(worldId)) p[s.id] = earned()
  return p
}
const skill = (id: string) => SKILLS.find((s) => s.id === id) as (typeof SKILLS)[number]

describe('journey rules (AC1)', () => {
  it('fresh kid: only the first jungle mission is open, and it is next', () => {
    const i = input({})
    expect(nextMission(i)).toEqual({ type: 'skill', skillId: 'add.within20' })
    expect(isUnlocked(skill('add.within20'), i)).toBe(true)
    expect(isUnlocked(skill('sub.within20'), i)).toBe(false)
    const nodes = mapNodes(i)
    expect(nodes).toHaveLength(SKILLS.length + 5)
    expect(nodes.filter((n) => n.state === 'current')).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ kind: 'skill', state: 'current' })
    expect(nodes.find((n) => n.kind === 'boss')).toMatchObject({
      worldId: 'jungle',
      state: 'locked',
    })
  })

  it('starting point at Savanna: jungle pre-mastered counts as cleared', () => {
    const p = applyStartingPoint({}, 'pv.tradeTens', NOW)
    const i = input(p)
    expect(worldCleared('jungle', i)).toBe(true)
    expect(nextMission(i)).toEqual({ type: 'skill', skillId: 'pv.tradeTens' })
    const jungleBoss = mapNodes(i).find((n) => n.kind === 'boss' && n.worldId === 'jungle')
    expect(jungleBoss?.state).toBe('crowned')
  })

  it('all world skills crowned but boss unbeaten: boss is next and gates the next world', () => {
    const p = crownWorld('jungle')
    const i = input(p)
    expect(nextMission(i)).toEqual({ type: 'boss', worldId: 'jungle' })
    expect(isUnlocked(skill('pv.tradeTens'), i)).toBe(false)
    const tradeTens = mapNodes(i).find((n) => n.kind === 'skill' && n.skill.id === 'pv.tradeTens')
    expect(tradeTens).toMatchObject({ state: 'locked', blockedBy: 'the Jungle Warm-up boss' })
  })

  it('boss beaten: the next world opens', () => {
    const i = input(crownWorld('jungle'), ['jungle'])
    expect(isUnlocked(skill('pv.tradeTens'), i)).toBe(true)
    expect(nextMission(i)).toEqual({ type: 'skill', skillId: 'pv.tradeTens' })
  })

  it('3+ due reviews come first', () => {
    const p = crownWorld('jungle')
    for (const s of skillsInWorld('jungle').slice(0, 3)) {
      p[s.id] = { ...earned(), nextReviewAt: NOW - DAY_MS }
    }
    expect(nextMission(input(p, ['jungle']))).toEqual({ type: 'review' })
  })

  it('everything crowned and cleared: review if due, else free play on the last mission', () => {
    const p: Record<string, SkillMastery> = {}
    for (const s of SKILLS) p[s.id] = earned()
    const all: WorldId[] = ['jungle', 'savanna', 'ocean', 'moon', 'mars']
    expect(nextMission(input(p, all))).toEqual({ type: 'skill', skillId: SKILLS.at(-1)?.id })
    p['add.within20'] = { ...earned(), nextReviewAt: NOW - 1 }
    expect(nextMission(input(p, all))).toEqual({ type: 'review' })
  })

  it('locked nodes say which mission comes first', () => {
    const node = mapNodes(input({})).find(
      (n) => n.kind === 'skill' && n.skill.id === 'sub.within20',
    )
    expect(node).toMatchObject({ state: 'locked', blockedBy: 'Add within 20' })
  })
})

describe('boss composer (AC2)', () => {
  it('10 questions over the world’s skills at difficulty 3–4, kinds supported, deterministic', () => {
    for (const w of ['jungle', 'savanna', 'ocean', 'moon', 'mars'] as WorldId[]) {
      const plan = composeBoss(w, 3)
      expect(plan).toHaveLength(10)
      const ids = new Set(skillsInWorld(w).map((s) => s.id))
      for (const p of plan) {
        expect(ids.has(p.skillId)).toBe(true)
        expect([3, 4]).toContain(p.fixedDifficulty)
        expect(skill(p.skillId).kinds).toContain(p.kind)
        expect(p.role).toBe('boss')
      }
      expect(new Set(plan.map((p) => p.skillId)).size).toBe(ids.size)
      expect(composeBoss(w, 3)).toEqual(plan)
    }
  })

  it('passes at 80% first-try', () => {
    expect(bossPassed(8, 10)).toBe(true)
    expect(bossPassed(7, 10)).toBe(false)
    expect(bossPassed(0, 0)).toBe(false)
  })
})
