import type { Avatar, AvatarCategory } from '@/domain'

/** Kid-facing names for every avatar choice (spoken on tap, spec 010). */
export const OPTION_NAMES: { [C in AvatarCategory]: Record<Avatar[C], string> } = {
  skin: {
    s1: 'Light',
    s2: 'Light tan',
    s3: 'Tan',
    s4: 'Brown',
    s5: 'Dark brown',
    s6: 'Deep brown',
  },
  hairStyle: {
    short: 'Short',
    curly: 'Curly',
    bob: 'Bob',
    long: 'Long',
    ponytail: 'Ponytail',
    buns: 'Two buns',
  },
  hairColor: {
    black: 'Black',
    brown: 'Brown',
    auburn: 'Auburn',
    blonde: 'Blonde',
    ginger: 'Ginger',
    purple: 'Purple',
  },
  eyes: { round: 'Round eyes', smiley: 'Smiley eyes', sparkly: 'Sparkly eyes' },
  outfit: {
    purple: 'Purple',
    orange: 'Orange',
    sky: 'Sky blue',
    green: 'Green',
    cyan: 'Crystal blue',
    coral: 'Coral',
  },
  hat: {
    none: 'No hat',
    helmet: 'Space helmet',
    safari: 'Safari hat',
    beanie: 'Beanie',
    bunny: 'Bunny ears',
    crown: 'Crown',
  },
  extra: {
    none: 'Nothing extra',
    glasses: 'Glasses',
    bowtie: 'Bow tie',
    cape: 'Star cape',
    jetpack: 'Jetpack',
  },
}

export const CATEGORY_TABS: { category: AvatarCategory; icon: string; label: string }[] = [
  { category: 'skin', icon: '🙂', label: 'Skin' },
  { category: 'hairStyle', icon: '💇', label: 'Hair' },
  { category: 'hairColor', icon: '🎨', label: 'Hair color' },
  { category: 'eyes', icon: '👀', label: 'Eyes' },
  { category: 'outfit', icon: '👕', label: 'Outfit' },
  { category: 'hat', icon: '🎩', label: 'Hat' },
  { category: 'extra', icon: '✨', label: 'Extra' },
]

/** Fun, space-and-animal nickname ideas (no real names needed, §1.5). */
export const NAME_IDEAS = ['Comet', 'Nova', 'Pixel', 'Starfish', 'Rocket', 'Panda'] as const

/** 1–12 letters or spaces. Returns the cleaned name or `null`. */
export function cleanNickname(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim()
  return /^[\p{L} ]{1,12}$/u.test(name) ? name : null
}
