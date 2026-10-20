// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  areasCleared,
  CHESS_AREAS,
  CHESS_SKILLS,
  chessDue,
  chessUnlocked,
  nextChessSkill,
} from '@/domain/chess/curriculum'
import { newMastery, type SkillMastery } from '@/domain'

const doc = readFileSync(
  fileURLToPath(new URL('../../../../specs/05-chess-skill-map.md', import.meta.url)),
  'utf8',
)

const crowned = (extra: Partial<SkillMastery> = {}): SkillMastery => ({
  ...newMastery(),
  mastery: 0.9,
  crowned: true,
  ...extra,
})

describe('chess curriculum (spec 016 AC1)', () => {
  it('matches the skill map: 18 skills, in order, in 3 areas', () => {
    const inDoc = [...doc.matchAll(/^\| `(chess\.[A-Za-z0-9]+)` \|/gm)].map((m) => m[1])
    expect(CHESS_SKILLS.map((s) => s.id)).toEqual(inDoc)
    expect(CHESS_SKILLS).toHaveLength(18)
    expect(CHESS_AREAS.map((a) => a.id)).toEqual(['courtyard', 'towers', 'throne'])
  })

  it('every skill lists the puzzle kinds named in the doc', () => {
    for (const skill of CHESS_SKILLS) {
      const row = doc.split('\n').find((l) => l.startsWith(`| \`${skill.id}\``)) ?? ''
      for (const kind of skill.kinds) expect(row, skill.id).toContain(kind)
    }
  })

  it('unlocks in order, one crown at a time', () => {
    expect(chessUnlocked({})).toEqual(['chess.board'])
    expect(nextChessSkill({})).toBe('chess.board')
    const progress = { 'chess.board': crowned(), 'chess.rook': crowned() }
    expect(chessUnlocked(progress)).toEqual(['chess.board', 'chess.rook', 'chess.bishop'])
    expect(nextChessSkill(progress)).toBe('chess.bishop')
  })

  it('reviews only chess skills, and clears areas when all are crowned', () => {
    const progress = {
      'chess.rook': crowned({ nextReviewAt: 5 }),
      'add.within20': crowned({ nextReviewAt: 1 }),
    }
    expect(chessDue(progress, 10)).toEqual(['chess.rook'])
    const courtyard = Object.fromEntries(
      CHESS_SKILLS.filter((s) => s.area === 'courtyard').map((s) => [s.id, crowned()]),
    )
    expect(areasCleared(courtyard)).toEqual(['courtyard'])
  })
})
