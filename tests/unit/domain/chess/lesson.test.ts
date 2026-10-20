import { describe, expect, it } from 'vitest'
import { legalMoves, type Square } from '@/domain/chess'
import {
  CHESS_LESSON_LENGTH,
  type ChessLessonState,
  chessLessonReducer,
  skipCheckPassed,
  startChessLesson,
} from '@/domain/chess/lesson'
import { type NextAnswer, nextAnswer } from '@/domain/chess/puzzles/solve'

/** Plays the right answer for the current puzzle until it's solved. */
export function solveCurrent(state: ChessLessonState, at = 1): ChessLessonState {
  let s = state
  for (let guard = 0; guard < 12 && s.phase === 'answering'; guard++) {
    const a = nextAnswer(s.run) as NextAnswer
    s =
      a.mode === 'tap'
        ? chessLessonReducer(s, { type: 'tap', square: a.square, at })
        : a.mode === 'choice'
          ? chessLessonReducer(s, { type: 'choice', value: a.value, at })
          : chessLessonReducer(s, { type: 'move', input: a.move, at })
  }
  return s
}

function playAll(state: ChessLessonState): ChessLessonState {
  let s = state
  while (s.phase !== 'complete') {
    s = solveCurrent(s)
    expect(s.phase).toBe('correct')
    s = chessLessonReducer(s, { type: 'continue', at: 2 })
  }
  return s
}

describe('chess lesson (spec 016 AC4)', () => {
  it.each(['chess.board', 'chess.rook', 'chess.knight', 'chess.mate1', 'chess.mateRK'])(
    '%s: 8 puzzles, all solvable, saved as chess answers',
    { timeout: 20_000 },
    (skillId) => {
      const done = playAll(startChessLesson({ skillId, seed: 7, at: 0 }))
      expect(done.results).toHaveLength(CHESS_LESSON_LENGTH)
      expect(done.results.every((r) => r.firstTry && r.kind.startsWith('chess.'))).toBe(true)
      expect(done.endedAt).toBe(2)
      expect(done.bestCombo).toBe(CHESS_LESSON_LENGTH)
    },
  )

  it('a wrong move gets a hint and a retry; a second miss shows the answer and comes back', () => {
    let s = startChessLesson({ skillId: 'chess.rook', seed: 3, at: 0 })
    while (s.puzzle.kind !== 'reach')
      s = chessLessonReducer(solveCurrent(s), { type: 'continue', at: 1 })
    const from = s.puzzle.marks.focus as Square
    const wrong = legalMoves(s.run.position, from).find(
      (m) => !(s.puzzle.squares ?? []).includes(m.to),
    )
    const miss = { type: 'move' as const, input: { from, to: wrong?.to as Square }, at: 1 }

    s = chessLessonReducer(s, miss)
    expect(s.phase).toBe('notYet')
    expect(s.hint).toBe('Land right on the star!')
    s = chessLessonReducer(s, { type: 'retry' })
    expect(s.phase).toBe('answering')
    s = chessLessonReducer(s, miss)
    expect(s.phase).toBe('solution')
    expect(s.results.at(-1)).toMatchObject({ solved: false, firstTry: false, attempts: 2 })
    const planned = s.plan.length
    s = chessLessonReducer(s, { type: 'continue', at: 2 })
    expect(s.plan).toHaveLength(planned + 1)
    expect(s.plan.at(-1)?.isRequeue).toBe(true)
  })

  it('illegal attempts are recorded as mistake patterns, not counted as misses (AC8)', () => {
    let s = startChessLesson({ skillId: 'chess.knight', seed: 5, at: 0 })
    const from = s.puzzle.marks.focus as Square
    s = chessLessonReducer(s, { type: 'illegal', reason: 'not-how-it-moves', from, at: 1 })
    expect(s.phase).toBe('answering')
    expect(s.attempts).toBe(0)
    s = solveCurrent(s)
    expect(s.results[0]).toMatchObject({
      firstTry: true,
      misconceptions: ['chess.not-how-it-moves:n'],
    })
  })

  it('skip-ahead: 3 hard puzzles, all right first try passes (AC6)', () => {
    const start = startChessLesson({ skillId: 'chess.bishop', seed: 9, at: 0, skipCheck: true })
    expect(start.plan).toHaveLength(3)
    expect(start.puzzle.difficulty).toBe(3)
    expect(skipCheckPassed(playAll(start))).toBe(true)

    // One wrong (legal) move on the first puzzle: the check can't pass any more.
    let s = startChessLesson({ skillId: 'chess.bishop', seed: 9, at: 0, skipCheck: true })
    const a = nextAnswer(s.run)
    expect(a?.mode).toBe('move')
    const right = a?.mode === 'move' ? a.move : null
    const wrong = legalMoves(s.run.position, right?.from).find((m) => m.to !== right?.to)
    s = chessLessonReducer(s, {
      type: 'move',
      input: { from: right?.from as Square, to: wrong?.to as Square },
      at: 1,
    })
    expect(s.phase).toBe('notYet')
    s = chessLessonReducer(s, { type: 'retry' })
    const done = playAll(s)
    expect(done.plan).toHaveLength(3) // no requeue in a check
    expect(skipCheckPassed(done)).toBe(false)
  })
})
