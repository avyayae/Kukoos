import { evaluate, VALUE } from './evaluate'
import { BITS, type FastBoard, type RawMove } from './fastBoard'

export const MATE = 100_000
/** Scores beyond this are "mate in N". */
export const MATE_BOUND = MATE - 1000
const INF = MATE + 1
const QUIESCE_MAX = 4

export interface SearchOptions {
  depth: number
  /** Look at captures past the horizon, so a piece isn't "won" into a recapture. */
  quiesce: boolean
  /** Stop deepening once this many nodes are searched (keeps the reply under ~1 s). */
  nodeBudget: number
}

export interface RootScore {
  move: RawMove
  score: number
}

const isCapture = (m: RawMove) => (m.flags & (BITS.capture | BITS.epCapture)) !== 0

/** Captures (most valuable victim, least valuable attacker), promotions, then the rest. */
function orderKey(m: RawMove): number {
  let key = 0
  if (m.captured) key += 10 * VALUE[m.captured] - VALUE[m.piece] + 10_000
  else if (m.flags & BITS.epCapture) key += 10_000
  if (m.promotion) key += VALUE[m.promotion] + 5_000
  return key
}

export const ordered = (moves: RawMove[]) =>
  moves
    .map((m) => ({ m, k: orderKey(m) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m)

class Aborted extends Error {}

/** One search over a board (spec 017). Mutates the board while it runs, then restores it. */
export class Searcher {
  nodes = 0
  private readonly path: bigint[] = []
  private readonly board: FastBoard
  private readonly options: SearchOptions

  constructor(board: FastBoard, options: SearchOptions) {
    this.board = board
    this.options = options
  }

  private tick() {
    if (++this.nodes > this.options.nodeBudget) throw new Aborted()
  }

  /** Stops at the first legal move (usually the first one tried). */
  private hasLegalMove(): boolean {
    for (const m of this.board.pseudoMoves()) {
      if (this.board.make(m)) {
        this.board.undo()
        return true
      }
    }
    return false
  }

  private quiesce(alpha: number, beta: number, qdepth: number): number {
    this.tick()
    const standPat = evaluate(this.board)
    if (standPat >= beta) return standPat
    if (standPat > alpha) alpha = standPat
    if (qdepth >= QUIESCE_MAX) return alpha
    for (const m of ordered(this.board.pseudoMoves().filter((x) => isCapture(x) || x.promotion))) {
      if (!this.board.make(m)) continue
      const score = -this.quiesce(-beta, -alpha, qdepth + 1)
      this.board.undo()
      if (score >= beta) return score
      if (score > alpha) alpha = score
    }
    return alpha
  }

  negamax(depth: number, alpha: number, beta: number, ply: number): number {
    this.tick()
    if (ply > 0 && this.path.includes(this.board.hash)) return 0
    if (depth === 0) {
      // Mate and stalemate at the horizon too, or a shallow bot stalemates a won game.
      if (!this.hasLegalMove()) return this.board.inCheck() ? -MATE + ply : 0
      return this.options.quiesce ? this.quiesce(alpha, beta, 0) : evaluate(this.board)
    }
    let best = -INF
    let legal = 0
    this.path.push(this.board.hash)
    try {
      for (const m of ordered(this.board.pseudoMoves())) {
        if (!this.board.make(m)) continue
        legal++
        let score: number
        try {
          score = -this.negamax(depth - 1, -beta, -alpha, ply + 1)
        } finally {
          this.board.undo()
        }
        if (score > best) best = score
        if (score > alpha) alpha = score
        if (alpha >= beta) break
      }
    } finally {
      this.path.pop()
    }
    if (legal === 0) return this.board.inCheck() ? -MATE + ply : 0
    return best
  }

  /**
   * Scores every root move at `depth`, best first. `draws` are root moves that repeat the
   * game's position a third time: they score 0 without a search.
   */
  rootScores(moves: RawMove[], depth: number, draws: ReadonlySet<RawMove>): RootScore[] {
    const scores: RootScore[] = []
    for (const move of moves) {
      if (draws.has(move)) {
        scores.push({ move, score: 0 })
        continue
      }
      this.board.make(move)
      try {
        scores.push({ move, score: -this.negamax(depth - 1, -INF, INF, 1) })
      } finally {
        this.board.undo()
      }
    }
    return scores.sort((a, b) => b.score - a.score)
  }

  /** The best root move with alpha-beta at the root (faster than `rootScores`). */
  best(moves: RawMove[], depth: number, draws: ReadonlySet<RawMove>): RootScore {
    let alpha = -INF
    let best: RootScore = { move: moves[0] as RawMove, score: -INF }
    for (const move of moves) {
      let score: number
      if (draws.has(move)) score = 0
      else {
        this.board.make(move)
        try {
          score = -this.negamax(depth - 1, -INF, -alpha, 1)
        } finally {
          this.board.undo()
        }
      }
      if (score > best.score) best = { move, score }
      if (score > alpha) alpha = score
    }
    return best
  }

  /**
   * Iterative deepening: depth 1, 2, … up to `options.depth`, best move first each time.
   * If the node budget runs out mid-iteration, the last finished iteration answers.
   */
  deepen(moves: RawMove[], draws: ReadonlySet<RawMove>): RootScore {
    let order = ordered(moves)
    let result: RootScore = { move: order[0] as RawMove, score: -INF }
    for (let depth = 1; depth <= this.options.depth; depth++) {
      try {
        result = this.best(order, depth, draws)
      } catch (e) {
        if (e instanceof Aborted) break
        throw e
      }
      if (result.score >= MATE_BOUND) break
      order = [result.move, ...order.filter((m) => m !== result.move)]
    }
    return result
  }

  /** True if `move` scores at least `floor` (a null-window check at `depth`). */
  atLeast(move: RawMove, depth: number, floor: number): boolean {
    this.board.make(move)
    try {
      return -this.negamax(depth - 1, -floor, -floor + 1, 1) >= floor
    } catch (e) {
      if (e instanceof Aborted) return false
      throw e
    } finally {
      this.board.undo()
    }
  }
}
