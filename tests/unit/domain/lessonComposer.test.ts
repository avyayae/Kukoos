import { describe, expect, it } from 'vitest'
import { getSkill } from '@/domain/curriculum/skillGraph'
import { SKILLS } from '@/domain/curriculum/skills'
import {
  bandFor,
  composeLesson,
  composeReview,
  dueSkills,
  kindsForMastery,
  type Progress,
  startDifficulty,
} from '@/domain/engine/lessonComposer'
import { DAY_MS, newMastery, type SkillMastery } from '@/domain/engine/mastery'

const NOW = 100 * DAY_MS
const crownedDue = (daysOverdue: number): SkillMastery => ({
  ...newMastery(),
  mastery: 0.9,
  crowned: true,
  srsBox: 3,
  nextReviewAt: NOW - daysOverdue * DAY_MS,
})
const atMastery = (m: number): SkillMastery => ({ ...newMastery(), mastery: m })

describe('bands and start difficulty', () => {
  it.each([
    [0, 'new', 1],
    [0.29, 'new', 2],
    [0.3, 'forming', 2],
    [0.6, 'forming', 3],
    [0.61, 'solid', 3],
    [1, 'solid', 4],
  ] as const)('mastery %f → %s, start difficulty %i', (m, band, d) => {
    expect(bandFor(m)).toBe(band)
    expect(startDifficulty(m)).toBe(d)
  })

  it('every skill × band uses only supported kinds; guided only on columns', () => {
    for (const skill of SKILLS) {
      for (const m of [0, 0.45, 0.9]) {
        const kinds = kindsForMastery(skill, m)
        expect(kinds).toHaveLength(10)
        for (const k of kinds) {
          expect(skill.kinds, `${skill.id} @${m}`).toContain(k.kind)
          if (k.guided) expect(k.kind).toBe('column')
        }
      }
    }
  })
})

describe('composeLesson: new skill (AC3)', () => {
  it('goes blocks ×3 → guided column ×3 → numeric/mcq at difficulty 1, no reviews or stretch', () => {
    const { plan, startDifficulty: d } = composeLesson({
      focusSkillId: 'sub.within100.regroup',
      progress: {},
      now: NOW,
      seed: 1,
    })
    expect(d).toBe(1)
    expect(plan.map((p) => `${p.kind}${p.guided ? '*' : ''}`)).toEqual([
      'tradeBlocks',
      'tradeBlocks',
      'tradeBlocks',
      'column*',
      'column*',
      'column*',
      'numeric',
      'mcq',
      'numeric',
      'mcq',
    ])
    expect(plan.every((p) => p.role === 'focus' && p.skillId === 'sub.within100.regroup')).toBe(
      true,
    )
    expect(plan.map((p) => p.seed)).toEqual(Array.from({ length: 10 }, (_, i) => 1000 + i))
  })
})

describe('composeLesson: solid skill with due reviews (AC4)', () => {
  const progress: Progress = {
    'sub.within100.regroup': atMastery(0.7),
    'add.within20': crownedDue(1),
    'sub.within20': crownedDue(5),
    'add.within100.noregroup': crownedDue(3),
    'sub.within100.noregroup': { ...crownedDue(0), nextReviewAt: NOW + DAY_MS }, // not due yet
  }
  const lesson = () =>
    composeLesson({ focusSkillId: 'sub.within100.regroup', progress, now: NOW, seed: 9 })

  it('has 10 questions: the 2 most overdue reviews, 1 stretch, no blocks or guided', () => {
    const { plan, startDifficulty: d } = lesson()
    expect(plan).toHaveLength(10)
    const reviews = plan.filter((p) => p.role === 'review')
    expect(reviews.map((p) => p.skillId)).toEqual(['sub.within20', 'add.within100.noregroup'])
    expect(reviews.every((p) => p.fixedDifficulty === 3)).toBe(true)
    expect(plan.indexOf(reviews[0] as (typeof plan)[number])).toBe(3)
    const stretch = plan.filter((p) => p.role === 'stretch')
    expect(stretch).toHaveLength(1)
    expect(stretch[0]?.fixedDifficulty).toBe(d + 1)
    expect(plan.some((p) => p.kind === 'tradeBlocks' || p.guided)).toBe(false)
    for (const p of plan) expect(getSkill(p.skillId).kinds).toContain(p.kind)
  })

  it('is deterministic for a seed', () => {
    expect(lesson()).toEqual(lesson())
  })

  it('never reviews the focus skill itself', () => {
    const { plan } = composeLesson({
      focusSkillId: 'add.within20',
      progress: { 'add.within20': crownedDue(10) },
      now: NOW,
      seed: 1,
    })
    expect(plan.some((p) => p.role === 'review')).toBe(false)
  })
})

describe('dueSkills and the Review mission (AC5)', () => {
  const progress: Progress = {
    'add.within20': crownedDue(1),
    'sub.within20': crownedDue(5),
    'pv.tradeTens': crownedDue(2),
  }

  it('lists due crowned skills, most overdue first', () => {
    expect(dueSkills(progress, NOW)).toEqual(['sub.within20', 'pv.tradeTens', 'add.within20'])
  })

  it('round-robins up to 10 review questions at difficulty 3', () => {
    const plan = composeReview(progress, NOW, 4)
    expect(plan).toHaveLength(9) // 3 skills × 3
    expect(plan.slice(0, 3).map((p) => p.skillId)).toEqual([
      'sub.within20',
      'pv.tradeTens',
      'add.within20',
    ])
    expect(plan.every((p) => p.role === 'review' && p.fixedDifficulty === 3)).toBe(true)
    for (const p of plan) expect(getSkill(p.skillId).kinds).toContain(p.kind)
    const many: Progress = Object.fromEntries(SKILLS.slice(0, 6).map((s) => [s.id, crownedDue(1)]))
    expect(composeReview(many, NOW, 1)).toHaveLength(10)
  })

  it('is empty when nothing is due', () => {
    expect(composeReview({}, NOW, 1)).toEqual([])
  })
})
