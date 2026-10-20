import { legalMoves, pieceAt, pieces, play, status } from '../position'
import { mateInOneMoves } from '../teach'
import type { MoveInput, Square } from '../types'
import { fewestMoves } from './generators'
import type { PuzzleRun } from './run'
import { answerMode } from './run'

export type NextAnswer =
  | { mode: 'tap'; square: Square }
  | { mode: 'choice'; value: string }
  | { mode: 'move'; move: MoveInput }

/**
 * The next right action for a puzzle in progress (spec 016): what Kukoos shows after a
 * second miss, and how tests play lessons. Multi-move puzzles are solved by search.
 */
export function nextAnswer(run: PuzzleRun): NextAnswer | null {
  const { puzzle } = run
  const mode = answerMode(puzzle)
  if (mode === 'tap')
    return puzzle.solution.square ? { mode, square: puzzle.solution.square } : null
  if (mode === 'choice') return puzzle.answer ? { mode, value: puzzle.answer } : null
  if (puzzle.kind === 'stars') {
    const move = starsStep(run)
    return move ? { mode, move } : null
  }
  if (puzzle.kind === 'mate') {
    const move = mateStep(run)
    return move ? { mode, move } : null
  }
  return puzzle.solution.move ? { mode, move: puzzle.solution.move } : null
}

/** First move of a shortest route through the stars left. */
function starsStep(run: PuzzleRun): MoveInput | null {
  const from = run.focus
  const piece = from ? pieceAt(run.position, from) : null
  if (!from || !piece) return null
  const walls = Object.fromEntries(
    pieces(run.position)
      .filter((p) => p.square !== from)
      .map((p) => [p.square, { type: p.type, color: p.color }]),
  )
  const best = fewestMoves(piece.type, from, walls, run.starsLeft)
  if (best === null) return null
  for (const m of legalMoves(run.position, from)) {
    const left = run.starsLeft.filter((s) => s !== m.to)
    if (left.length === 0) return { from, to: m.to }
    const rest = fewestMoves(piece.type, m.to, walls, left)
    if (rest !== null && rest === best - 1) return { from, to: m.to }
  }
  return null
}

/** A move that mates now, or that leaves mate in one after every king reply. */
function mateStep(run: PuzzleRun): MoveInput | null {
  const p = run.position
  const now = mateInOneMoves(p)[0]
  if (now) return { from: now.from, to: now.to }
  for (const m of legalMoves(p)) {
    const after = play(p, m)?.position
    if (!after || status(after).over) continue
    const forced = legalMoves(after).every((r) => {
      const next = play(after, r)?.position
      return !!next && mateInOneMoves(next).length > 0
    })
    if (forced) return { from: m.from, to: m.to }
  }
  return null
}
