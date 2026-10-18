import { createRng } from './rng'

/**
 * The kid's explorer avatar (spec 010): a layered character built from these parts.
 * Pure data and rules; the drawing lives in src/ui/AvatarArt.tsx.
 */
export const AVATAR_OPTIONS = {
  skin: ['s1', 's2', 's3', 's4', 's5', 's6'],
  hairStyle: ['short', 'curly', 'bob', 'long', 'ponytail', 'buns'],
  hairColor: ['black', 'brown', 'auburn', 'blonde', 'ginger', 'purple'],
  eyes: ['round', 'smiley', 'sparkly'],
  outfit: ['purple', 'orange', 'sky', 'green', 'cyan', 'coral'],
  hat: ['none', 'helmet', 'safari', 'beanie', 'bunny', 'crown'],
  extra: ['none', 'glasses', 'bowtie', 'cape', 'jetpack'],
} as const

export type AvatarCategory = keyof typeof AVATAR_OPTIONS
export type Avatar = { [C in AvatarCategory]: (typeof AVATAR_OPTIONS)[C][number] }

export const AVATAR_CATEGORIES = Object.keys(AVATAR_OPTIONS) as AvatarCategory[]

export const DEFAULT_AVATAR: Avatar = {
  skin: 's3',
  hairStyle: 'curly',
  hairColor: 'brown',
  eyes: 'round',
  outfit: 'purple',
  hat: 'none',
  extra: 'none',
}

function isOption<C extends AvatarCategory>(category: C, value: unknown): value is Avatar[C] {
  return (AVATAR_OPTIONS[category] as readonly unknown[]).includes(value)
}

/** A stored avatar (any shape, maybe from an older version) → a valid one; unknown parts use defaults. */
export function parseAvatar(raw: unknown): Avatar {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...DEFAULT_AVATAR }
  for (const category of AVATAR_CATEGORIES) {
    const value = source[category]
    if (isOption(category, value)) (out as Record<AvatarCategory, string>)[category] = value
  }
  return out
}

/** What earned items look at (spec 010: progress, never purchases). */
export interface UnlockState {
  level: number
  badges: ReadonlySet<string>
  bossesBeaten: number
}

type EarnedRule =
  | { type: 'level'; level: number }
  | { type: 'badge'; badgeId: string }
  | { type: 'bosses'; count: number }

interface EarnedItem {
  category: AvatarCategory
  value: string
  rule: EarnedRule
  howTo: string
}

export const EARNED_ITEMS: readonly EarnedItem[] = [
  { category: 'hat', value: 'crown', rule: { type: 'level', level: 5 }, howTo: 'Get to level 5.' },
  {
    category: 'extra',
    value: 'cape',
    rule: { type: 'badge', badgeId: 'astronaut' },
    howTo: 'Keep your flame going for 7 days.',
  },
  {
    category: 'extra',
    value: 'jetpack',
    rule: { type: 'bosses', count: 1 },
    howTo: 'Beat a world boss.',
  },
]

function earnedRule(category: AvatarCategory, value: string): EarnedItem | undefined {
  return EARNED_ITEMS.find((e) => e.category === category && e.value === value)
}

export function itemUnlocked(category: AvatarCategory, value: string, state: UnlockState): boolean {
  const earned = earnedRule(category, value)
  if (!earned) return true
  const { rule } = earned
  switch (rule.type) {
    case 'level':
      return state.level >= rule.level
    case 'badge':
      return state.badges.has(rule.badgeId)
    case 'bosses':
      return state.bossesBeaten >= rule.count
  }
}

/** "Earn it: …" for a locked item; `null` for free items. */
export function howToEarn(category: AvatarCategory, value: string): string | null {
  return earnedRule(category, value)?.howTo ?? null
}

/** "Surprise me!": a seeded random look using only unlocked items. */
export function randomAvatar(seed: number, state: UnlockState): Avatar {
  const rng = createRng(seed)
  const out = { ...DEFAULT_AVATAR }
  for (const category of AVATAR_CATEGORIES) {
    const options = AVATAR_OPTIONS[category].filter((v) => itemUnlocked(category, v, state))
    ;(out as Record<AvatarCategory, string>)[category] = rng.pick(options)
  }
  return out
}

const HAIR_WORDS: Record<Avatar['hairStyle'], string> = {
  short: 'short hair',
  curly: 'curly hair',
  bob: 'a bob',
  long: 'long hair',
  ponytail: 'a ponytail',
  buns: 'two buns',
}
const HAT_WORDS: Record<Avatar['hat'], string | null> = {
  none: null,
  helmet: 'a space helmet',
  safari: 'a safari hat',
  beanie: 'a beanie',
  bunny: 'bunny ears',
  crown: 'a crown',
}
const EXTRA_WORDS: Record<Avatar['extra'], string | null> = {
  none: null,
  glasses: 'glasses',
  bowtie: 'a bow tie',
  cape: 'a star cape',
  jetpack: 'a jetpack',
}

/** Spoken / accessible description: "Explorer with curly hair and a space helmet". */
export function avatarName(avatar: Avatar): string {
  const parts = [HAIR_WORDS[avatar.hairStyle], HAT_WORDS[avatar.hat], EXTRA_WORDS[avatar.extra]]
  const words = parts.filter((p): p is string => p !== null)
  const list =
    words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : (words[0] ?? '')
  return `Explorer with ${list}`
}
