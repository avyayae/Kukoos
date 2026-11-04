// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BADGES, isSpanishBadge, newBadges } from '@/domain'
import { SPANISH_AREAS, spanishSkillsIn } from '@/domain/spanish/curriculum'

const stats = (crowned: string[]) => ({
  completedLessons: 1,
  perfectLessons: 0,
  firstTryAnswers: 0,
  crowned: new Set(crowned),
  bossesBeaten: 0,
  streak: 0,
})

describe('Hola Island stickers (spec 020 AC3)', () => {
  it('one sticker per area: Harbor flag, Market basket, Fiesta piñata', () => {
    expect(BADGES.filter((b) => isSpanishBadge(b.id)).map((b) => [b.id, b.emoji])).toEqual([
      ['es.area.harbor', '⚓'],
      ['es.area.market', '🧺'],
      ['es.area.jungle', '🪅'],
    ])
    expect(SPANISH_AREAS.map((a) => a.esName)).toEqual(['El puerto', 'El mercado', 'La selva'])
  })

  it('crowning every Harbor skill earns the Harbor flag, once', () => {
    const harbor = spanishSkillsIn('harbor').map((s) => s.id)
    const owned = new Set(['first-flight'])
    expect(newBadges(stats(harbor.slice(1)), owned).map((b) => b.id)).toEqual([])
    expect(newBadges(stats(harbor), owned).map((b) => b.id)).toEqual(['es.area.harbor'])
    expect(newBadges(stats(harbor), new Set([...owned, 'es.area.harbor']))).toEqual([])
  })
})
