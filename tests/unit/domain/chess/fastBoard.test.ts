// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { fromFen, legalMoves } from '@/domain/chess'
import { FastBoard, toInput } from '@/domain/chess/bot/fastBoard'
import { randomPosition } from './botFixtures'

const key = (m: { from: string; to: string; promotion?: string }) =>
  `${m.from}${m.to}${m.promotion ?? ''}`

// The bot uses chess.js 1.4.0 internals for speed. If an upgrade changes them, this fails
// first: the fast board must agree exactly with the public rules engine.
describe('fast board matches the rules engine (spec 017)', () => {
  const special = [
    // Castling both ways, with and without the right.
    'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b Kq - 0 1',
    // Castling through check is not allowed.
    'r3k2r/8/8/8/8/8/5q2/R3K2R w KQkq - 0 1',
    // En passant, and a promotion with captures.
    'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
    '1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    // Pinned pieces, and in check.
    '4k3/8/8/8/4r3/8/4B3/4K3 w - - 0 1',
    '4k3/8/8/8/8/8/3q4/4K3 w - - 0 1',
  ]
  const fens = [...special, ...Array.from({ length: 60 }, (_, i) => randomPosition(i + 100, i).fen)]

  it.each(fens)('same legal moves: %s', (fen) => {
    const board = new FastBoard(fen)
    const fast = board.legalMoves().map(toInput).map(key).sort()
    const engine = legalMoves(fromFen(fen)).map(key).sort()
    expect(fast).toEqual(engine)
  })

  it('make and undo restore the position, and the hash follows it', () => {
    for (const fen of fens) {
      const board = new FastBoard(fen)
      const hash = board.hash
      for (const m of board.pseudoMoves()) {
        if (board.make(m)) {
          expect(board.hash).not.toBe(hash)
          board.undo()
        }
        expect(board.fen()).toBe(fen)
        expect(board.hash).toBe(hash)
      }
    }
  })

  it('rejects a move that leaves the king in check', () => {
    const board = new FastBoard('4k3/8/8/8/4r3/8/4B3/4K3 w - - 0 1')
    const pinned = board.pseudoMoves().filter((m) => toInput(m).from === 'e2')
    expect(pinned.length).toBeGreaterThan(0)
    for (const m of pinned) expect(board.make(m)).toBe(false)
    expect(board.fen()).toBe('4k3/8/8/8/4r3/8/4B3/4K3 w - - 0 1')
  })
})
