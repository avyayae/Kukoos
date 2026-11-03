import { isDue, type SkillMastery } from '../engine/mastery'
import type { SkillId, SpanishKind } from '../types'

export type { SpanishKind }

/** The Spanish course (spec 019, `specs/06-spanish-skill-map.md`). */
export type SpanishAreaId = 'harbor' | 'market' | 'jungle'

export interface SpanishArea {
  id: SpanishAreaId
  title: string
  emoji: string
  /** Sticker earned when every skill in the area is crowned (F20). */
  sticker: { id: string; name: string; emoji: string }
}

export interface SpanishSkill {
  id: SkillId
  title: string
  area: SpanishAreaId
  /** Scored kinds, cycled through a lesson. */
  kinds: readonly Exclude<SpanishKind, 'say'>[]
  /** What Kukoos says when the skill opens (English). */
  intro: string
}

export const SPANISH_AREAS: readonly SpanishArea[] = [
  {
    id: 'harbor',
    title: 'Harbor',
    emoji: '⚓',
    sticker: { id: 'es.area.harbor', name: 'Harbor flag', emoji: '⚓' },
  },
  {
    id: 'market',
    title: 'Market',
    emoji: '🧺',
    sticker: { id: 'es.area.market', name: 'Market basket', emoji: '🧺' },
  },
  {
    id: 'jungle',
    title: 'Jungle Trail',
    emoji: '🌴',
    sticker: { id: 'es.area.jungle', name: 'Fiesta piñata', emoji: '🪅' },
  },
]

const WORDS = ['listen', 'see', 'match'] as const
const NUMBERS = ['listen', 'count', 'see', 'match'] as const

export const SPANISH_SKILLS: readonly SpanishSkill[] = [
  {
    id: 'es.hello',
    title: 'Hello!',
    area: 'harbor',
    kinds: WORDS,
    intro: 'Let’s say hello and goodbye in Spanish!',
  },
  {
    id: 'es.manners',
    title: 'Kind words',
    area: 'harbor',
    kinds: WORDS,
    intro: 'Please and thank you: kind words in Spanish.',
  },
  {
    id: 'es.feelings',
    title: 'Feelings',
    area: 'harbor',
    kinds: WORDS,
    intro: 'How do you feel today? Let’s learn feelings.',
  },
  {
    id: 'es.colors1',
    title: 'Colours',
    area: 'harbor',
    kinds: WORDS,
    intro: 'Red, blue, yellow and green, in Spanish!',
  },
  {
    id: 'es.colors2',
    title: 'More colours',
    area: 'harbor',
    kinds: WORDS,
    intro: 'Six more colours to paint the island.',
  },
  {
    id: 'es.numbers1',
    title: 'Count to 5',
    area: 'harbor',
    kinds: NUMBERS,
    intro: 'Let’s count to five in Spanish!',
  },
  {
    id: 'es.numbers2',
    title: 'Count to 10',
    area: 'market',
    kinds: NUMBERS,
    intro: 'Six, seven, eight… let’s count to ten!',
  },
  {
    id: 'es.numbers3',
    title: 'Count to 20',
    area: 'market',
    kinds: NUMBERS,
    intro: 'Big numbers, all the way to twenty!',
  },
  {
    id: 'es.fruit',
    title: 'Fruit',
    area: 'market',
    kinds: WORDS,
    intro: 'The market has yummy fruit. Let’s name it!',
  },
  {
    id: 'es.food',
    title: 'Food',
    area: 'market',
    kinds: WORDS,
    intro: 'Bread, cheese, milk… food in Spanish.',
  },
  {
    id: 'es.snacks',
    title: 'Treats',
    area: 'market',
    kinds: WORDS,
    intro: 'Ice cream and cake: treats in Spanish!',
  },
  {
    id: 'es.market',
    title: 'Big and small',
    area: 'market',
    kinds: WORDS,
    intro: 'Big, small, a lot, a little.',
  },
  {
    id: 'es.pets',
    title: 'Pets',
    area: 'jungle',
    kinds: WORDS,
    intro: 'Dogs, cats and fish: pets in Spanish!',
  },
  {
    id: 'es.farm',
    title: 'Farm animals',
    area: 'jungle',
    kinds: WORDS,
    intro: 'Moo! Let’s meet the farm animals.',
  },
  {
    id: 'es.wild',
    title: 'Wild animals',
    area: 'jungle',
    kinds: WORDS,
    intro: 'Lions and monkeys live on the jungle trail!',
  },
  {
    id: 'es.family',
    title: 'Family',
    area: 'jungle',
    kinds: WORDS,
    intro: 'Mom, dad, brother, sister: family in Spanish.',
  },
  {
    id: 'es.body',
    title: 'My body',
    area: 'jungle',
    kinds: WORDS,
    intro: 'Hands, feet and eyes: let’s name them!',
  },
  {
    id: 'es.home',
    title: 'At home',
    area: 'jungle',
    kinds: WORDS,
    intro: 'House, bed, door: things at home.',
  },
]

const byId = new Map(SPANISH_SKILLS.map((s) => [s.id, s]))

export const isSpanishSkill = (id: SkillId) => byId.has(id)

export function getSpanishSkill(id: SkillId): SpanishSkill {
  const skill = byId.get(id)
  if (!skill) throw new Error(`Unknown Spanish skill: ${id}`)
  return skill
}

/** Skills before this one, in course order. */
export const skillsBefore = (id: SkillId): SpanishSkill[] =>
  SPANISH_SKILLS.slice(
    0,
    SPANISH_SKILLS.findIndex((s) => s.id === id),
  )

export const spanishSkillsIn = (area: SpanishAreaId) =>
  SPANISH_SKILLS.filter((s) => s.area === area)

type SpanishProgress = Partial<Record<SkillId, SkillMastery>>

/** Skills unlock in order: each one opens when the one before it is crowned (§2.1). */
export function spanishUnlocked(progress: SpanishProgress): SkillId[] {
  const open: SkillId[] = []
  for (const skill of SPANISH_SKILLS) {
    open.push(skill.id)
    if (!progress[skill.id]?.crowned) break
  }
  return open
}

/** The skill to play next: the first one not crowned yet (`null` when all are). */
export function nextSpanishSkill(progress: SpanishProgress): SkillId | null {
  return SPANISH_SKILLS.find((s) => !progress[s.id]?.crowned)?.id ?? null
}

/** Crowned Spanish skills due for review, oldest first. */
export function spanishDue(progress: SpanishProgress, now: number): SkillId[] {
  return SPANISH_SKILLS.map((s) => s.id)
    .filter((id) => isDue(progress[id], now))
    .sort((a, b) => (progress[a]?.nextReviewAt ?? 0) - (progress[b]?.nextReviewAt ?? 0))
}

export type SpanishNodeState = 'locked' | 'available' | 'current' | 'crowned'

export interface SpanishNode {
  skill: SpanishSkill
  order: number
  state: SpanishNodeState
  mastery: number
}

/** Every Spanish skill with its state on the home list (and the F20 island map). */
export function spanishNodes(progress: SpanishProgress): SpanishNode[] {
  const open = new Set(spanishUnlocked(progress))
  const current = nextSpanishSkill(progress)
  return SPANISH_SKILLS.map((skill, i) => {
    const m = progress[skill.id]
    const state: SpanishNodeState = m?.crowned
      ? 'crowned'
      : skill.id === current
        ? 'current'
        : open.has(skill.id)
          ? 'available'
          : 'locked'
    return { skill, order: i + 1, state, mastery: m?.mastery ?? 0 }
  })
}
