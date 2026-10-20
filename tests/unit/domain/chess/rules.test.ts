import { describe, expect, it } from 'vitest'
import { createRng } from '@/domain'
import {
  canMove,
  fromFen,
  legalMoves,
  pieceAt,
  pieces,
  play,
  type Position,
  type Square,
  startPosition,
  status,
  turn,
} from '@/domain/chess'

/** Plays moves given as "e2e4" (plus an optional promotion letter); fails loudly. */
function line(p: Position, ...moves: string[]): Position {
  return moves.reduce((pos, m) => {
    const promotion = m[4] as 'q' | 'r' | 'b' | 'n' | undefined
    const next = play(pos, {
      from: m.slice(0, 2) as Square,
      to: m.slice(2, 4) as Square,
      ...(promotion ? { promotion } : {}),
    })
    if (!next) throw new Error(`illegal in fixture: ${m}`)
    return next.position
  }, p)
}

function perft(p: Position, depth: number): number {
  const moves = legalMoves(p)
  if (depth === 1) return moves.length
  let n = 0
  for (const m of moves) {
    const next = play(p, m)
    if (next) n += perft(next.position, depth - 1)
  }
  return n
}

const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'

describe('correct rules (spec 014 AC2)', () => {
  it('perft from the start: 20 / 400 / 8,902', () => {
    const p = startPosition()
    expect([perft(p, 1), perft(p, 2), perft(p, 3)]).toEqual([20, 400, 8902])
  })

  it('perft on Kiwipete: 48 / 2,039', () => {
    const p = fromFen(KIWIPETE)
    expect([perft(p, 1), perft(p, 2)]).toEqual([48, 2039])
  })

  it('200 seeded random games stay legal', { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed)
      let p = startPosition()
      for (let ply = 0; ply < 40 && !status(p).over; ply++) {
        const moves = legalMoves(p)
        expect(moves.length).toBeGreaterThan(0)
        const next = play(p, rng.pick(moves))
        expect(next).not.toBeNull()
        if (!next) break
        expect(turn(next.position)).not.toBe(turn(p))
        p = next.position
      }
      // Exactly one king each, always.
      const kings = pieces(p).filter((x) => x.type === 'k')
      expect(kings.map((k) => k.color).sort()).toEqual(['b', 'w'])
    }
  })
})

describe('special moves and endings (spec 014 AC3)', () => {
  it('castles both sides', () => {
    const p = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
    const short = play(p, { from: 'e1', to: 'g1' })
    expect(short?.move).toMatchObject({ san: 'O-O', castle: true })
    expect(pieceAt(short?.position ?? p, 'f1')).toEqual({ type: 'r', color: 'w' })
    const long = play(p, { from: 'e1', to: 'c1' })
    expect(long?.move.san).toBe('O-O-O')
    expect(pieceAt(long?.position ?? p, 'd1')).toEqual({ type: 'r', color: 'w' })
  })

  it.each([
    ['through check', 'r3kr2/8/8/8/8/8/8/R3K2R w KQq - 0 1'],
    ['out of check', '4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1'],
    ['after the king moved', 'r3k2r/8/8/8/8/8/8/R3K2R w kq - 0 1'],
    ['when blocked', 'r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1'],
  ])('refuses to castle %s', (_, fen) => {
    expect(canMove(fromFen(fen), 'e1', 'g1')).toBe(false)
  })

  it('en passant right away, not one move later', () => {
    const p = line(startPosition(), 'e2e4', 'a7a6', 'e4e5', 'd7d5')
    const ep = play(p, { from: 'e5', to: 'd6' })
    expect(ep?.move).toMatchObject({ enPassant: true, capture: true, captured: 'p' })
    expect(pieceAt(ep?.position ?? p, 'd5')).toBeNull()
    const later = line(p, 'h2h3', 'a6a5')
    expect(canMove(later, 'e5', 'd6')).toBe(false)
  })

  it.each(['q', 'r', 'b', 'n'] as const)('promotes to %s', (piece) => {
    const p = fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1')
    const next = play(p, { from: 'a7', to: 'a8', promotion: piece })
    expect(next?.move.promotion).toBe(piece)
    expect(pieceAt(next?.position ?? p, 'a8')).toEqual({ type: piece, color: 'w' })
  })

  it('back-rank and smothered checkmates', () => {
    const backRank = line(fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'), 'a1a8')
    expect(status(backRank)).toMatchObject({
      check: true,
      checkmate: true,
      over: true,
      winner: 'w',
    })
    const smothered = line(fromFen('6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1'), 'g5f7')
    expect(status(smothered)).toMatchObject({ checkmate: true, winner: 'w' })
  })

  it('stalemate, insufficient material and the fifty-move rule are draws', () => {
    expect(status(fromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'))).toMatchObject({
      stalemate: true,
      draw: 'stalemate',
      over: true,
      winner: null,
    })
    expect(status(fromFen('k7/8/8/8/8/8/8/K7 w - - 0 1')).draw).toBe('insufficient')
    expect(status(fromFen('k7/8/8/8/8/8/8/K6R w - - 100 80')).draw).toBe('fifty-move')
    expect(status(fromFen('k7/8/8/8/8/8/8/K6R w - - 99 80')).over).toBe(false)
  })

  it('threefold repetition is a draw', () => {
    const shuffle = ['g1f3', 'g8f6', 'f3g1', 'f6g8']
    const twice = line(startPosition(), ...shuffle)
    expect(status(twice).draw).toBeNull()
    expect(status(line(twice, ...shuffle))).toMatchObject({ draw: 'threefold', over: true })
  })
})

describe('free practice boards (spec 014 AC4)', () => {
  it('accept boards without kings; moves work; the game never ends', () => {
    expect(() => fromFen('8/8/8/8/3R4/8/8/8 w - - 0 1')).toThrow()
    const p = fromFen('8/8/8/8/3R4/8/8/8 w - - 0 1', { free: true })
    expect(legalMoves(p, 'd4')).toHaveLength(14)
    expect(status(p)).toMatchObject({ check: false, checkmate: false, draw: null, over: false })
  })
})

describe('immutability (spec 014 AC7)', () => {
  it('play returns a new position and leaves the input alone', () => {
    const p = startPosition()
    const before = JSON.stringify(p)
    const next = play(p, { from: 'e2', to: 'e4' })
    expect(JSON.stringify(p)).toBe(before)
    expect(next?.position).not.toBe(p)
    expect(play(p, { from: 'e2', to: 'e5' })).toBeNull()
  })
})
