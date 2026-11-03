import { CHESS_AREAS, chessSkillsIn } from '../chess/curriculum'
import type { SkillId } from '../types'

/** What badge rules look at, after the lesson that was just saved. */
export interface BadgeStats {
  completedLessons: number
  perfectLessons: number
  firstTryAnswers: number
  crowned: ReadonlySet<SkillId>
  bossesBeaten: number
  streak: number
}

export type BadgeRule =
  | { type: 'lessons'; count: number }
  | { type: 'perfect'; count: number }
  | { type: 'firstTry'; count: number }
  | { type: 'crown'; skillId: SkillId }
  | { type: 'bosses'; count: number }
  | { type: 'streak'; days: number }
  /** Every one of these skills crowned (a chess castle area, spec 016). */
  | { type: 'crownAll'; skillIds: readonly SkillId[] }

export interface BadgeDef {
  id: string
  name: string
  emoji: string
  /** How to earn it, spoken on tap in the trophy room. */
  howTo: string
  rule: BadgeRule
}

/** The first badge set (spec 008), as data. Order = trophy room order. */
export const BADGES: readonly BadgeDef[] = [
  {
    id: 'first-flight',
    name: 'First Flight',
    emoji: '🐣',
    howTo: 'Finish your first mission.',
    rule: { type: 'lessons', count: 1 },
  },
  {
    id: 'carry-captain',
    name: 'Carry Captain',
    emoji: '⛵',
    howTo: 'Get a crown in adding with a carry.',
    rule: { type: 'crown', skillId: 'add.within100.regroup' },
  },
  {
    id: 'borrow-boss',
    name: 'Borrow Boss',
    emoji: '🦁',
    howTo: 'Get a crown in taking away with a trade.',
    rule: { type: 'crown', skillId: 'sub.within100.regroup' },
  },
  {
    id: 'zero-hero',
    name: 'Zero Hero',
    emoji: '🦸',
    howTo: 'Get a crown in taking away across a zero.',
    rule: { type: 'crown', skillId: 'sub.3digit.acrossZero' },
  },
  {
    id: 'animal-rescuer',
    name: 'Animal Rescuer',
    emoji: '🐾',
    howTo: 'Beat a world boss.',
    rule: { type: 'bosses', count: 1 },
  },
  {
    id: 'perfect-pilot',
    name: 'Perfect Pilot',
    emoji: '✈️',
    howTo: 'Get every question right on the first try in 5 missions.',
    rule: { type: 'perfect', count: 5 },
  },
  {
    id: 'astronaut',
    name: 'Astronaut',
    emoji: '🧑‍🚀',
    howTo: 'Keep your flame going for 7 days.',
    rule: { type: 'streak', days: 7 },
  },
  {
    id: 'hundred-correct',
    name: '100 Correct',
    emoji: '💯',
    howTo: 'Get 100 answers right on the first try.',
    rule: { type: 'firstTry', count: 100 },
  },
  // Chess castle areas (spec 016): a sticker for crowning every skill in an area.
  ...CHESS_AREAS.map((area): BadgeDef => ({
    id: area.sticker.id,
    name: area.sticker.name,
    emoji: area.sticker.emoji,
    howTo: `Get a crown in every ${area.title} mission in Chess Castle.`,
    rule: { type: 'crownAll', skillIds: chessSkillsIn(area.id).map((s) => s.id) },
  })),
]

/** Chess stickers only make sense to kids who learn chess. */
export const isChessBadge = (id: string) => id.startsWith('chess.')

export function getBadge(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id)
}

function earned(rule: BadgeRule, s: BadgeStats): boolean {
  switch (rule.type) {
    case 'lessons':
      return s.completedLessons >= rule.count
    case 'perfect':
      return s.perfectLessons >= rule.count
    case 'firstTry':
      return s.firstTryAnswers >= rule.count
    case 'crown':
      return s.crowned.has(rule.skillId)
    case 'bosses':
      return s.bossesBeaten >= rule.count
    case 'streak':
      return s.streak >= rule.days
    case 'crownAll':
      return rule.skillIds.every((id) => s.crowned.has(id))
  }
}

/** Badges whose rule is now true and that the kid doesn't have yet (never awarded twice). */
export function newBadges(stats: BadgeStats, owned: ReadonlySet<string>): BadgeDef[] {
  return BADGES.filter((b) => !owned.has(b.id) && earned(b.rule, stats))
}
