import { explainIllegal, PIECE_NAMES, whyNot } from '../explain'
import { legalMoves, pieceAt, play, status, turn, withTurn } from '../position'
import { attackersOf } from '../teach'
import type { ChessMove, IllegalReason, MoveInput, Position, Square } from '../types'
import type { Puzzle } from './types'

/** A puzzle in progress: some puzzles take several moves (stars, mate drills). */
export interface PuzzleRun {
  puzzle: Puzzle
  position: Position
  /** Where the piece to move is now (it moves around in `stars`). */
  focus: Square | null
  starsLeft: readonly Square[]
  moves: number
  lastMove: { from: Square; to: Square } | null
}

export type RunOutcome = 'solved' | 'continue' | 'wrong'

export interface RunStep {
  run: PuzzleRun
  outcome: RunOutcome
  /** A gentle line for `wrong` (and for the defender's reply in a mate drill). */
  hint?: string
  /** Set when the move wasn't legal (spec 014 reasons, for mistake patterns). */
  illegal?: IllegalReason
  /** The move that was played, if any. */
  move?: ChessMove
}

export function startRun(puzzle: Puzzle): PuzzleRun {
  return {
    puzzle,
    position: puzzle.position,
    focus: puzzle.marks.focus ?? null,
    starsLeft: puzzle.marks.stars ?? [],
    moves: 0,
    lastMove: null,
  }
}

const name = (p: Position, sq: Square) => PIECE_NAMES[pieceAt(p, sq)?.type ?? 'p']

function wrong(run: PuzzleRun, hint: string, illegal?: IllegalReason): RunStep {
  return { run, outcome: 'wrong', hint, ...(illegal ? { illegal } : {}) }
}

/**
 * Plays the kid's move in a board puzzle (spec 016 AC4). Illegal moves get the spec 014
 * "why not" line; legal but wrong moves get a hint about the puzzle's idea.
 */
export function runMove(run: PuzzleRun, input: MoveInput): RunStep {
  const { puzzle } = run
  const before = run.position
  const illegal = explainIllegal(before, input.from, input.to)
  if (illegal) {
    return wrong(run, whyNot(illegal, pieceAt(before, input.from)?.type ?? null), illegal)
  }
  if (run.focus && input.from !== run.focus) {
    return wrong(run, `Move the ${name(before, run.focus)}!`)
  }
  const played = play(before, input)
  if (!played) return wrong(run, 'Try another move.')
  const after = played.position
  const moved: PuzzleRun = {
    ...run,
    position: after,
    focus: run.focus ? input.to : null,
    moves: run.moves + 1,
    lastMove: { from: input.from, to: input.to },
  }
  const step = (outcome: RunOutcome, r: PuzzleRun = moved, hint?: string): RunStep => ({
    run: r,
    outcome,
    move: played.move,
    ...(hint ? { hint } : {}),
  })

  switch (puzzle.kind) {
    case 'reach':
    case 'capture':
      return (puzzle.squares ?? []).includes(input.to)
        ? step('solved')
        : puzzle.kind === 'reach'
          ? wrong(run, 'Land right on the star!')
          : wrong(
              run,
              puzzle.marks.target ? 'Capture the 🎯 piece!' : 'Find the most valuable piece.',
            )

    case 'stars': {
      const starsLeft = moved.starsLeft.filter((s) => s !== input.to)
      // Practice boards: the same side keeps moving.
      const next = { ...moved, starsLeft, position: withTurn(after, turn(before)) }
      if (starsLeft.length === 0) return step('solved', next)
      if (next.moves >= (puzzle.maxMoves ?? Infinity)) {
        return wrong(run, `Try to get every star in ${puzzle.maxMoves} moves.`)
      }
      return step('continue', next)
    }

    case 'safe': {
      const watchers = attackersOf(after, input.to, turn(after))
      if (watchers.length === 0) return step('solved')
      const by = watchers[0] as Square
      return wrong(run, `That square is watched by the ${name(after, by)}!`)
    }

    case 'escape':
      // Every legal move gets out of check; illegal ones were explained above.
      return step('solved')

    case 'mate1':
      return status(after).checkmate
        ? step('solved')
        : wrong(run, 'Close! Find a move the king can’t escape.')

    case 'mate':
      return mateStep(run, moved, played.move)

    default:
      return wrong(run, 'Tap the answer instead.')
  }
}

/** Mate drills: mate wins; otherwise the lone king replies (it grabs any loose piece). */
function mateStep(run: PuzzleRun, moved: PuzzleRun, move: ChessMove): RunStep {
  const st = status(moved.position)
  if (st.checkmate) return { run: moved, outcome: 'solved', move }
  if (st.stalemate) {
    return wrong(run, 'Oops, stalemate! The king must have a move. Try again.')
  }
  if (moved.moves >= (run.puzzle.maxMoves ?? Infinity)) {
    return wrong(run, `Catch the king in ${run.puzzle.maxMoves} moves. Try again!`)
  }
  const reply = defenderMove(moved.position)
  if (!reply) return wrong(run, 'Try again!')
  const after = play(moved.position, reply)
  if (!after) return wrong(run, 'Try again!')
  if (reply.capture) {
    return wrong(
      run,
      `The king took your ${PIECE_NAMES[reply.captured ?? 'q']}! Keep it protected.`,
    )
  }
  return {
    run: { ...moved, position: after.position, lastMove: { from: reply.from, to: reply.to } },
    outcome: 'continue',
    move,
  }
}

/**
 * The lone king's reply in a mate drill: take a loose piece if it can, else run towards the
 * middle (the hardest place to be mated). Deterministic.
 */
export function defenderMove(p: Position): ChessMove | null {
  const moves = legalMoves(p)
  if (moves.length === 0) return null
  const capture = moves.find((m) => m.capture)
  if (capture) return capture
  const centre = (sq: Square) => {
    const x = 'abcdefgh'.indexOf(sq[0] ?? 'a')
    const y = Number(sq[1]) - 1
    return Math.abs(3.5 - x) + Math.abs(3.5 - y)
  }
  return [...moves].sort((a, b) => centre(a.to) - centre(b.to))[0] ?? null
}

/** `find` puzzles: tap a square. */
export function runTap(run: PuzzleRun, square: Square): RunStep {
  const right = run.puzzle.squares ?? []
  if (right.includes(square)) return { run, outcome: 'solved' }
  const goal = right[0] ?? ''
  return wrong(run, `That’s ${square}. Find ${goal}!`)
}

/** `count` / `which` puzzles: pick a tile. */
export function runChoice(run: PuzzleRun, choice: string): RunStep {
  if (choice === run.puzzle.answer) return { run, outcome: 'solved' }
  return wrong(
    run,
    run.puzzle.kind === 'count'
      ? 'Count again: check every direction.'
      : 'Look again at the king. Can he escape?',
  )
}

/** Whether this kind is answered on the board (moves), by tapping a square, or by a tile. */
export function answerMode(puzzle: Puzzle): 'move' | 'tap' | 'choice' {
  if (puzzle.kind === 'find') return 'tap'
  if (puzzle.kind === 'count' || puzzle.kind === 'which') return 'choice'
  return 'move'
}
