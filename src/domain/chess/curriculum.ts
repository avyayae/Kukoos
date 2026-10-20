import type { ChessPuzzleKind, SkillId } from '../types'
import { isDue, type SkillMastery } from '../engine/mastery'

/** The chess course (spec 016, `specs/05-chess-skill-map.md`). */
export type ChessAreaId = 'courtyard' | 'towers' | 'throne'

export interface ChessArea {
  id: ChessAreaId
  title: string
  emoji: string
  /** Sticker earned when every skill in the area is crowned. */
  sticker: { id: string; name: string; emoji: string }
}

export interface ChessSkill {
  id: SkillId
  title: string
  area: ChessAreaId
  kinds: readonly ChessPuzzleKind[]
  /** What Kukoos says when the skill opens. */
  intro: string
}

export const CHESS_AREAS: readonly ChessArea[] = [
  {
    id: 'courtyard',
    title: 'Courtyard',
    emoji: '🏰',
    sticker: { id: 'chess.area.courtyard', name: 'Courtyard flag', emoji: '🚩' },
  },
  {
    id: 'towers',
    title: 'Towers',
    emoji: '🗼',
    sticker: { id: 'chess.area.towers', name: 'Tower bell', emoji: '🔔' },
  },
  {
    id: 'throne',
    title: 'Throne Room',
    emoji: '👑',
    sticker: { id: 'chess.area.throne', name: "King's crown", emoji: '👑' },
  },
]

export const CHESS_SKILLS: readonly ChessSkill[] = [
  {
    id: 'chess.board',
    title: 'The board',
    area: 'courtyard',
    kinds: ['find'],
    intro: 'Every square has a name, like e4. Let’s find some!',
  },
  {
    id: 'chess.rook',
    title: 'The rook',
    area: 'courtyard',
    kinds: ['reach', 'stars', 'count'],
    intro: 'The rook moves in straight lines, as far as it likes.',
  },
  {
    id: 'chess.bishop',
    title: 'The bishop',
    area: 'courtyard',
    kinds: ['reach', 'stars', 'count'],
    intro: 'The bishop moves diagonally and stays on its colour.',
  },
  {
    id: 'chess.queen',
    title: 'The queen',
    area: 'courtyard',
    kinds: ['reach', 'stars', 'count'],
    intro: 'The queen moves like a rook and a bishop together!',
  },
  {
    id: 'chess.king',
    title: 'The king',
    area: 'courtyard',
    kinds: ['reach', 'stars'],
    intro: 'The king moves just one step, any way he likes.',
  },
  {
    id: 'chess.knight',
    title: 'The knight',
    area: 'courtyard',
    kinds: ['reach', 'stars', 'count'],
    intro: 'The knight jumps in an L shape, right over other pieces.',
  },
  {
    id: 'chess.pawn',
    title: 'The pawn',
    area: 'courtyard',
    kinds: ['reach', 'capture'],
    intro: 'Pawns march forward and capture diagonally.',
  },
  {
    id: 'chess.setup',
    title: 'Setting up',
    area: 'courtyard',
    kinds: ['find'],
    intro: 'Every piece has a home square. Where do they start?',
  },
  {
    id: 'chess.capture',
    title: 'Capturing',
    area: 'towers',
    kinds: ['capture'],
    intro: 'Pieces are worth points. Capture the best one!',
  },
  {
    id: 'chess.safety',
    title: 'Stay safe',
    area: 'towers',
    kinds: ['safe'],
    intro: 'Keep your pieces where they can’t be taken.',
  },
  {
    id: 'chess.check',
    title: 'Check!',
    area: 'towers',
    kinds: ['which'],
    intro: 'When the king is attacked, that’s check!',
  },
  {
    id: 'chess.escape',
    title: 'Escape check',
    area: 'towers',
    kinds: ['escape'],
    intro: 'Save the king: move it, block, or capture the attacker.',
  },
  {
    id: 'chess.special',
    title: 'Special moves',
    area: 'towers',
    kinds: ['reach', 'which'],
    intro: 'Castling and en passant are special moves. Let’s try them!',
  },
  {
    id: 'chess.mateOrNot',
    title: 'Mate or not?',
    area: 'throne',
    kinds: ['which'],
    intro: 'Checkmate means the king can’t escape. Is it mate?',
  },
  {
    id: 'chess.draws',
    title: 'Draws',
    area: 'throne',
    kinds: ['which'],
    intro: 'Sometimes nobody wins. That’s a draw!',
  },
  {
    id: 'chess.mate1',
    title: 'Mate in one',
    area: 'throne',
    kinds: ['mate1'],
    intro: 'Find the move that wins the game!',
  },
  {
    id: 'chess.mateQK',
    title: 'Queen mate',
    area: 'throne',
    kinds: ['mate'],
    intro: 'Your queen and king can catch the lone king.',
  },
  {
    id: 'chess.mateRK',
    title: 'Rook mate',
    area: 'throne',
    kinds: ['mate'],
    intro: 'A rook and king can catch him too!',
  },
]

const byId = new Map(CHESS_SKILLS.map((s) => [s.id, s]))

export function getChessSkill(id: SkillId): ChessSkill {
  const skill = byId.get(id)
  if (!skill) throw new Error(`Unknown chess skill: ${id}`)
  return skill
}

export const isChessSkill = (id: SkillId) => byId.has(id)

export const chessSkillsIn = (area: ChessAreaId) => CHESS_SKILLS.filter((s) => s.area === area)

type ChessProgress = Partial<Record<SkillId, SkillMastery>>

/** Skills unlock in order: each one opens when the one before it is crowned (§2.1). */
export function chessUnlocked(progress: ChessProgress): SkillId[] {
  const open: SkillId[] = []
  for (const skill of CHESS_SKILLS) {
    open.push(skill.id)
    if (!progress[skill.id]?.crowned) break
  }
  return open
}

/** The skill to play next: the first one not crowned yet (`null` when all are). */
export function nextChessSkill(progress: ChessProgress): SkillId | null {
  return CHESS_SKILLS.find((s) => !progress[s.id]?.crowned)?.id ?? null
}

/** Crowned chess skills due for review, oldest first. */
export function chessDue(progress: ChessProgress, now: number): SkillId[] {
  return CHESS_SKILLS.map((s) => s.id)
    .filter((id) => isDue(progress[id], now))
    .sort((a, b) => (progress[a]?.nextReviewAt ?? 0) - (progress[b]?.nextReviewAt ?? 0))
}

/** Areas whose every skill is crowned. */
export function areasCleared(progress: ChessProgress): ChessAreaId[] {
  return CHESS_AREAS.filter((a) => chessSkillsIn(a.id).every((s) => progress[s.id]?.crowned)).map(
    (a) => a.id,
  )
}

export type CastleNodeState = 'locked' | 'available' | 'current' | 'crowned'

export interface CastleNode {
  skill: ChessSkill
  /** 1-based position on the path. */
  order: number
  state: CastleNodeState
  mastery: number
}

/** Every chess skill with its castle-map state (spec 016 AC7). */
export function castleNodes(progress: ChessProgress): CastleNode[] {
  const open = new Set(chessUnlocked(progress))
  const current = nextChessSkill(progress)
  return CHESS_SKILLS.map((skill, i) => {
    const m = progress[skill.id]
    const state: CastleNodeState = m?.crowned
      ? 'crowned'
      : skill.id === current
        ? 'current'
        : open.has(skill.id)
          ? 'available'
          : 'locked'
    return { skill, order: i + 1, state, mastery: m?.mastery ?? 0 }
  })
}
