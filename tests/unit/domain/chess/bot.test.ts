// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  canMove,
  fromFen,
  isMateInOne,
  legalMoves,
  play,
  type Position,
  startPosition,
  status,
} from '@/domain/chess'
import { BOT_LEVELS, bestMove, chooseMove, LEVELS } from '@/domain/chess/bot'
import { MATE_IN_ONE } from '@/domain/chess/puzzles/positions'
import { bot, hint, randomPosition } from './botFixtures'

const after = (p: Position, m: { from: string; to: string }) =>
  (play(p, m as Parameters<typeof play>[1]) as { position: Position }).position

/** Mate with Qc8#, or stalemate with Qc7 (spec 017 AC3). */
const MATE_OR_STALEMATE = 'k7/8/1K6/2Q5/8/8/8/8 w - - 0 1'

describe('Kukoos bot is legal and repeatable (spec 017 AC1)', () => {
  const positions = Array.from({ length: 200 }, (_, i) => randomPosition(i + 1, i % 60)).filter(
    (p) => !status(p).over,
  )

  it.each(LEVELS)('level %i: a legal move in every live position', { timeout: 60_000 }, (level) => {
    expect(positions.length).toBeGreaterThan(180)
    for (const [i, p] of positions.entries()) {
      const m = bot(p, level, i)
      expect(canMove(p, m.from, m.to), `${p.fen} ${JSON.stringify(m)}`).toBe(true)
      expect(play(p, m), p.fen).not.toBeNull()
    }
  })

  it('the same position, level and seed give the same move', { timeout: 60_000 }, () => {
    for (const level of LEVELS) {
      for (const [i, p] of positions.slice(0, 25).entries()) {
        expect(chooseMove(p, level, i * 7)).toEqual(chooseMove(p, level, i * 7))
      }
    }
  })

  it('never moves when the game is over', () => {
    const mated = [
      { from: 'f2', to: 'f3' },
      { from: 'e7', to: 'e5' },
      { from: 'g2', to: 'g4' },
      { from: 'd8', to: 'h4' },
    ].reduce(after, startPosition())
    expect(status(mated).checkmate).toBe(true)
    const stalemate = fromFen('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1')
    expect(status(stalemate).stalemate).toBe(true)
    const practice = fromFen('8/8/8/3R4/8/8/8/8 w - - 0 1', { free: true })
    for (const level of LEVELS) {
      expect(chooseMove(mated, level, 1)).toBeNull()
      expect(chooseMove(stalemate, level, 1)).toBeNull()
      expect(chooseMove(practice, level, 1)).toBeNull()
    }
    expect(bestMove(mated)).toBeNull()
  })
})

describe('level traits (spec 017 AC3)', () => {
  const seeds = Array.from({ length: 30 }, (_, i) => i)

  it('Clever and Wise Kukoos always play a mate in one', () => {
    for (const fen of MATE_IN_ONE) {
      const p = fromFen(fen)
      for (const level of [3, 4] as const) {
        for (const seed of seeds) {
          const m = bot(p, level, seed)
          expect(status(after(p, m)).checkmate, `${fen} level ${level} seed ${seed}`).toBe(true)
        }
      }
    }
  })

  it('no level stalemates a lone king when it could mate', () => {
    const p = fromFen(MATE_OR_STALEMATE)
    expect(isMateInOne(p)).toBe(true)
    for (const level of LEVELS) {
      for (const seed of seeds) {
        const m = bot(p, level, seed)
        expect(status(after(p, m)).stalemate, `level ${level} seed ${seed}`).toBe(false)
      }
    }
  })

  it('Sleepy Kukoos takes a free queen only some of the time', () => {
    // Black to move; the white queen on d5 is free for the knight on f6.
    const p = fromFen('r1bqkb1r/pppp1ppp/2n2n2/3Qp3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 4')
    const takes = Array.from({ length: 100 }, (_, seed) => chooseMove(p, 1, seed)).filter(
      (m) => m?.from === 'f6' && m.to === 'd5',
    ).length
    expect(takes).toBeGreaterThan(30)
    expect(takes).toBeLessThan(85)
    // Wise Kukoos never misses it.
    for (const seed of seeds) expect(chooseMove(p, 4, seed)).toMatchObject({ to: 'd5' })
  })

  it('Sleepy Kukoos sometimes leaves its own piece hanging', () => {
    // Black's knight on e5 is attacked by the d4 pawn and not defended.
    const p = fromFen('rnbqkb1r/pppppppp/8/4n3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 3')
    const moves = Array.from({ length: 100 }, (_, seed) => bot(p, 1, seed))
    const left = moves.filter((m) => m.from !== 'e5').length
    expect(left).toBeGreaterThan(10)
    // Every move is still a real, legal move.
    const legal = new Set(legalMoves(p).map((m) => m.from + m.to))
    for (const m of moves) expect(legal.has(m.from + m.to)).toBe(true)
  })

  it('levels get deeper and slip less', () => {
    for (const level of [2, 3, 4] as const) {
      const [def, before] = [BOT_LEVELS[level], BOT_LEVELS[(level - 1) as 1 | 2 | 3]]
      expect(def.depth).toBeGreaterThanOrEqual(before.depth)
      expect(def.slip).toBeLessThanOrEqual(before.slip)
    }
  })
})

describe('hint (spec 017)', () => {
  it('finds the mate in one', () => {
    for (const fen of MATE_IN_ONE) {
      const p = fromFen(fen)
      expect(status(after(p, hint(p))).checkmate, fen).toBe(true)
    }
  })

  it('saves a hanging queen', () => {
    // White's queen on h5 is attacked by the g6 pawn.
    const p = fromFen('rnbqkbnr/pppppp1p/6p1/7Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3')
    const m = hint(p)
    expect(m.from).toBe('h5')
  })
})
