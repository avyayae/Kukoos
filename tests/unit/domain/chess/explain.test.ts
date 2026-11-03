import { describe, expect, it } from 'vitest'
import {
  explainIllegal,
  fromFen,
  type IllegalReason,
  isMateInOne,
  material,
  mateInOneMoves,
  PIECE_NAMES,
  pieceAt,
  reachable,
  type Square,
  startPosition,
  whyNot,
} from '@/domain/chess'

const START = startPosition().fen

describe('why not? (spec 014 AC5)', () => {
  it.each<[IllegalReason, string, Square, Square]>([
    ['empty', START, 'e4', 'e5'],
    ['not-your-turn', START, 'e7', 'e5'],
    ['own-piece', START, 'b1', 'd2'],
    ['not-how-it-moves', '4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', 'c1', 'c4'],
    ['not-how-it-moves', START, 'e2', 'd3'],
    ['blocked', START, 'a1', 'a3'],
    ['blocked', '4k3/8/8/8/4p3/8/4P3/4K3 w - - 0 1', 'e2', 'e4'],
    ['king-in-check', '4k3/8/8/8/8/8/4r3/R3K3 w - - 0 1', 'a1', 'a5'],
    ['pinned', '4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1', 'e2', 'd3'],
    ['into-check', '4k3/8/8/8/8/8/3r4/4K3 w - - 0 1', 'e1', 'd1'],
    ['castle-not-allowed', 'r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1', 'e1', 'g1'],
  ])('%s (%s %s→%s)', (reason, fen, from, to) => {
    const p = fromFen(fen)
    expect(explainIllegal(p, from, to)).toBe(reason)
    const piece = pieceAt(p, from)
    const line = whyNot(reason, piece?.type ?? null)
    expect(line.length).toBeGreaterThan(0)
    if (piece && reason !== 'king-in-check') expect(line).toContain(PIECE_NAMES[piece.type])
  })

  it('a legal move has no reason', () => {
    expect(explainIllegal(startPosition(), 'e2', 'e4')).toBeNull()
    expect(explainIllegal(startPosition(), 'g1', 'f3')).toBeNull()
  })

  it('the bishop hint says diagonally', () => {
    expect(whyNot('not-how-it-moves', 'b')).toBe('The bishop moves diagonally.')
  })
})

describe('teaching helpers (spec 014 AC6)', () => {
  it('counts material with classic values', () => {
    expect(material(startPosition())).toEqual({ w: 39, b: 39 })
    expect(material(fromFen('4k3/8/8/8/8/8/8/R3K2Q w - - 0 1'))).toEqual({ w: 14, b: 0 })
  })

  it('reachable squares work on practice boards, for either colour', () => {
    const rook = fromFen('8/8/8/8/3R4/8/8/8 w - - 0 1', { free: true })
    expect(reachable(rook, 'd4')).toHaveLength(14)
    const knight = fromFen('8/8/8/8/3n4/8/8/8 w - - 0 1', { free: true })
    expect(reachable(knight, 'd4').sort()).toEqual(
      ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'].sort(),
    )
    expect(reachable(rook, 'a1')).toEqual([])
  })

  it.each([
    '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    'k7/8/1K6/8/8/8/7Q/8 w - - 0 1',
    'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
  ])('mate in one: %s', (fen) => {
    expect(isMateInOne(fromFen(fen))).toBe(true)
  })

  it.each([
    START,
    '6k1/5pp1/8/8/8/8/8/R5K1 w - - 0 1',
    '6rk/6p1/8/6N1/8/8/8/6K1 w - - 0 1',
    'k7/8/8/8/8/8/8/K6R w - - 0 1',
    '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
  ])('not mate in one: %s', (fen) => {
    expect(isMateInOne(fromFen(fen))).toBe(false)
  })

  it('lists exactly the mating moves', () => {
    const moves = mateInOneMoves(fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'))
    expect(moves.map((m) => m.san)).toEqual(['Ra8#'])
  })
})
