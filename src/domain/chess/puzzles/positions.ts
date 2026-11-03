/**
 * Hand-picked positions for puzzles that generators can't make well (spec 016). These are
 * only FENs: every answer is computed by the rules engine when the puzzle is built (§3.4),
 * and tests check each list holds what its name says.
 */

/** Mate in one, for the side to move. */
export const MATE_IN_ONE: readonly string[] = [
  '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
  '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  'k7/8/1K6/8/8/8/7Q/8 w - - 0 1',
  '7k/8/6K1/8/8/8/8/R7 w - - 0 1',
  '6k1/8/6K1/8/8/8/8/1Q6 w - - 0 1',
  '3r2k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
  'k7/pp6/8/8/8/5B2/1Q6/6K1 w - - 0 1',
  '7k/R7/1R6/8/8/8/8/6K1 w - - 0 1',
  'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
]

/** Forced mate in two with queen and king (found by search, verified in tests). */
export const MATE_QK: readonly string[] = [
  '3k4/Q7/8/4K3/8/8/8/8 w - - 0 1',
  '8/k7/2K5/8/8/8/8/7Q w - - 0 1',
  '6Q1/8/7k/4K3/8/8/8/8 w - - 0 1',
  '8/8/8/8/Q7/8/4K3/7k w - - 0 1',
]

/** Forced mate in two with rook and king. */
export const MATE_RK: readonly string[] = [
  '2k5/8/1K6/8/8/8/7R/8 w - - 0 1',
  '8/8/8/R7/8/5K2/8/4k3 w - - 0 1',
  '7k/8/8/3R1K2/8/8/8/8 w - - 0 1',
  '8/8/8/8/8/R1K5/8/1k6 w - - 0 1',
  '1k6/8/2K5/8/8/3R4/8/8 w - - 0 1',
]

/** White is in check: get out of it (move, block or capture). */
export const IN_CHECK: readonly string[] = [
  '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1',
  '4k3/4r3/8/8/8/8/3B4/4K3 w - - 0 1',
  '4k3/8/8/8/1b6/8/8/R3K2R w KQ - 0 1',
  '4k3/8/8/8/8/5n2/8/4K3 w - - 0 1',
  '4k3/8/8/8/8/8/8/q3K3 w - - 0 1',
  '4k3/8/8/8/8/8/3p4/4K3 w - - 0 1',
  '4k3/8/8/b7/8/8/8/4K3 w - - 0 1',
  '4k3/8/8/8/8/8/6PP/4K2r w - - 0 1',
]

/** Not in check (for "Check or not?"). */
export const NOT_IN_CHECK: readonly string[] = [
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
  '4k3/8/8/8/3n4/8/8/4K3 w - - 0 1',
  '4k3/8/8/b7/8/8/3P4/4K3 w - - 0 1',
]

/** Checkmate, check or stalemate, for the side to move. */
export const MATE_OR_NOT: readonly string[] = [
  'R5k1/5ppp/8/8/8/8/8/6K1 b - - 1 1',
  '6rk/5Npp/8/8/8/8/8/6K1 b - - 1 1',
  'k6Q/8/1K6/8/8/8/8/8 b - - 1 1',
  '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
  'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1',
  'R3k3/8/8/8/8/8/8/4K3 b - - 0 1',
  '4k3/8/8/1B6/8/8/8/4K3 b - - 0 1',
]

/** Draw or not, for the side to move (stalemate, too little to mate). */
export const DRAW_OR_NOT: readonly string[] = [
  '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
  'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1',
  'k7/8/8/8/8/8/8/K7 b - - 0 1',
  'k7/8/8/8/8/8/8/KN6 b - - 0 1',
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  'k7/8/8/8/8/8/8/K6R b - - 0 1',
  '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1',
]

/** "Can White castle on the king's side?" */
export const CAN_CASTLE: readonly string[] = [
  'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
  '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',
  'r3kr2/8/8/8/8/8/8/R3K2R w KQq - 0 1',
  '4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1',
  'r3k2r/8/8/8/8/8/8/R3K2R w Qkq - 0 1',
  'r3k2r/8/8/8/8/8/8/R3KB1R w KQkq - 0 1',
]

/** Special moves to play: castle (king to g1/c1) or en passant. */
export const SPECIAL_MOVES: readonly { fen: string; from: string; to: string; what: string }[] = [
  {
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    from: 'e1',
    to: 'g1',
    what: 'Castle on the king’s side!',
  },
  {
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    from: 'e1',
    to: 'c1',
    what: 'Castle on the queen’s side!',
  },
  {
    fen: 'rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
    from: 'e5',
    to: 'd6',
    what: 'Capture the pawn en passant!',
  },
  {
    fen: '4k3/8/8/2pP4/8/8/8/4K3 w - c6 0 1',
    from: 'd5',
    to: 'c6',
    what: 'Capture the pawn en passant!',
  },
]
