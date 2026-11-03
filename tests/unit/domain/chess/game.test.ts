// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  applyMove,
  endGame,
  fromUci,
  type GameState,
  hangingPieces,
  isKidsTurn,
  kidMoves,
  newGame,
  play,
  type Position,
  replay,
  START_FEN,
  takeBack,
  takeBackCount,
  toUci,
  whisperFor,
} from '@/domain/chess'

/** Plays UCI moves on a game; fails loudly on an illegal one. */
function moves(game: GameState, ...ucis: string[]): GameState {
  return ucis.reduce((g, uci) => {
    const next = applyMove(g, fromUci(uci))
    if (!next) throw new Error(`illegal in fixture: ${uci}`)
    return next.game
  }, game)
}

describe('a game against Kukoos (spec 017 AC5)', () => {
  it('starts at the start, kid as White moves first', () => {
    const g = newGame(1, 'w')
    expect(g.position.fen).toBe(START_FEN)
    expect(isKidsTurn(g)).toBe(true)
    expect(isKidsTurn(newGame(1, 'b'))).toBe(false)
  })

  it('records moves as UCI, refuses illegal ones', () => {
    const g = moves(newGame(2, 'w'), 'e2e4', 'e7e5')
    expect(g.moves).toEqual(['e2e4', 'e7e5'])
    expect(g.lastMove).toEqual({ from: 'e7', to: 'e5' })
    expect(applyMove(g, { from: 'e4', to: 'e6' })).toBeNull()
    expect(toUci({ from: 'e7', to: 'e8', promotion: 'q' })).toBe('e7e8q')
    expect(fromUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
  })

  it('a checkmate is a win or a loss for the kid', () => {
    const fools = ['f2f3', 'e7e5', 'g2g4', 'd8h4']
    expect(moves(newGame(1, 'b'), ...fools).result).toBe('win')
    expect(moves(newGame(1, 'w'), ...fools).result).toBe('loss')
    const over = moves(newGame(1, 'w'), ...fools)
    expect(applyMove(over, { from: 'a2', to: 'a3' })).toBeNull()
  })

  it('draws are named', () => {
    const stalemate = moves(newGame(1, 'w', 'k7/8/1K6/2Q5/8/8/8/8 w - - 0 1'), 'c5c7')
    expect(stalemate.result).toBe('draw:stalemate')
    const knights = ['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8']
    expect(moves(newGame(1, 'w'), ...knights).result).toBe('draw:threefold')
  })

  it('take back removes the kid’s move and Kukoos’s reply', () => {
    const g = moves(newGame(1, 'w'), 'e2e4', 'e7e5')
    expect(takeBackCount(g)).toBe(2)
    expect(takeBack(g).position.fen).toBe(START_FEN)
    // While Kukoos is still thinking, only the kid's move goes.
    const thinking = moves(newGame(1, 'w'), 'e2e4', 'e7e5', 'g1f3')
    expect(takeBackCount(thinking)).toBe(1)
    expect(takeBack(thinking).moves).toEqual(['e2e4', 'e7e5'])
  })

  it('nothing to take back before the kid has moved, or after the game ends', () => {
    expect(takeBackCount(newGame(1, 'w'))).toBe(0)
    const asBlack = moves(newGame(1, 'b'), 'e2e4')
    expect(takeBackCount(asBlack)).toBe(0)
    expect(takeBack(asBlack)).toBe(asBlack)
    expect(takeBackCount(moves(asBlack, 'e7e5', 'g1f3'))).toBe(2)
    expect(takeBackCount(moves(newGame(1, 'b'), 'f2f3', 'e7e5', 'g2g4', 'd8h4'))).toBe(0)
  })

  it('replay rebuilds a saved game, repetitions included', () => {
    const g = moves(newGame(3, 'w'), 'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1')
    const again = replay(g, g.moves)
    expect(again.position).toEqual(g.position)
    expect(again.result).toBeNull()
    expect(moves(again, 'f6g8').result).toBe('draw:threefold')
    expect(() => replay(g, ['e2e5'])).toThrow()
  })

  it('counts the kid’s moves for either colour', () => {
    const g = moves(newGame(1, 'w'), 'e2e4', 'e7e5', 'g1f3')
    expect(kidMoves(g)).toBe(2)
    expect(kidMoves({ ...g, kidColor: 'b' })).toBe(1)
  })

  it('end game is "stopped", never a loss, and keeps a real result', () => {
    expect(endGame(newGame(1, 'w')).result).toBe('ended')
    const won = moves(newGame(1, 'b'), 'f2f3', 'e7e5', 'g2g4', 'd8h4')
    expect(endGame(won).result).toBe('win')
  })
})

describe('the Sleepy Kukoos whisper (spec 017 AC5)', () => {
  const kidMove = (fen: string, uci: string) => {
    const before = replay({ level: 1, kidColor: 'w', startFen: fen }, []).position
    const next = play(before, fromUci(uci))
    if (!next) throw new Error(`illegal in fixture: ${uci}`)
    return whisperFor(before, next.position, next.move)
  }
  const afterE4E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

  it('a bishop left where a pawn can take it', () => {
    expect(kidMove(afterE4E5, 'f1a6')).toBe('a6')
  })

  it('a safe move gets no whisper', () => {
    expect(kidMove(afterE4E5, 'f1c4')).toBeNull()
    expect(kidMove(afterE4E5, 'g1f3')).toBeNull()
  })

  it('a knight that grabs a pawn and can be taken back', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    expect(kidMove(fen, 'f3e5')).toBe('e5')
  })

  it('a fair trade is not a blunder', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 0 4'
    expect(kidMove(fen, 'd4c6')).toBeNull()
  })

  it('a piece that was already hanging isn’t whispered again', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 0 3'
    const before: Position = replay({ level: 1, kidColor: 'w', startFen: fen }, []).position
    expect(hangingPieces(before, 'w')).toContain('d4')
    expect(kidMove(fen, 'a2a3')).toBeNull()
  })
})
