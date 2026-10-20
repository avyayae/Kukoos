import { describe, expect, it } from 'vitest'
import {
  boardFen,
  canMove,
  fromFen,
  legalMoves,
  mateInOneMoves,
  pieceAt,
  pieces,
  play,
  type Square,
  status,
} from '@/domain/chess'
import { CHESS_SKILLS } from '@/domain/chess/curriculum'
import {
  ALL_SQUARES,
  fewestMoves,
  generatePuzzle,
  geometryTargets,
} from '@/domain/chess/puzzles/generators'
import {
  CAN_CASTLE,
  DRAW_OR_NOT,
  IN_CHECK,
  MATE_IN_ONE,
  MATE_OR_NOT,
  MATE_QK,
  MATE_RK,
  NOT_IN_CHECK,
  SPECIAL_MOVES,
} from '@/domain/chess/puzzles/positions'
import { answerMode, runChoice, runMove, runTap, startRun } from '@/domain/chess/puzzles/run'
import type { Puzzle, PuzzleDifficulty } from '@/domain/chess/puzzles/types'

/** Generated boards get many seeds; list-based kinds only pick from small lists. */
const SEEDS = 25
const LIST_SEEDS = 6
const FROM_LISTS = new Set(['which', 'escape', 'mate1', 'mate'])
const DIFFICULTIES: PuzzleDifficulty[] = [1, 2, 3]

/** Every move the focus piece (or anyone, if none) could legally make. */
function candidateMoves(p: Puzzle) {
  return legalMoves(p.position, p.marks.focus)
}

function checkPuzzle(p: Puzzle) {
  const run = startRun(p)
  switch (answerMode(p)) {
    case 'tap': {
      expect(runTap(run, p.solution.square as Square).outcome).toBe('solved')
      const wrong = ALL_SQUARES.find((s) => !(p.squares ?? []).includes(s)) as Square
      expect(runTap(run, wrong).outcome).toBe('wrong')
      return
    }
    case 'choice': {
      expect(p.choices).toContain(p.answer)
      for (const c of p.choices ?? []) {
        expect(runChoice(run, c).outcome).toBe(c === p.answer ? 'solved' : 'wrong')
      }
      return
    }
    case 'move':
      break
  }
  if (p.kind === 'stars') {
    const focus = p.marks.focus as Square
    const piece = pieceAt(p.position, focus)
    const blockers = Object.fromEntries(
      pieces(p.position)
        .filter((x) => x.square !== focus)
        .map((x) => [x.square, { type: x.type, color: x.color }]),
    )
    const best = fewestMoves(piece?.type ?? 'r', focus, blockers, p.marks.stars ?? [])
    expect(best).not.toBeNull()
    expect(best ?? 99).toBeLessThanOrEqual(p.maxMoves ?? 0)
    return
  }
  if (p.kind === 'mate') return // forced mate in 2 is checked on the lists below
  // The checker accepts exactly the right moves (the rules engine decides, §3.4).
  for (const m of candidateMoves(p)) {
    const step = runMove(run, {
      from: m.from,
      to: m.to,
      ...(m.promotion ? { promotion: m.promotion } : {}),
    })
    const next = play(p.position, m)?.position
    const expected =
      p.kind === 'escape'
        ? true
        : p.kind === 'mate1'
          ? !!next && status(next).checkmate
          : (p.squares ?? []).includes(m.to)
    expect(step.outcome === 'solved', `${p.id} ${m.san}`).toBe(expected)
  }
  const sol = p.solution.move
  expect(sol && runMove(run, sol).outcome).toBe('solved')
}

describe('puzzle generators (spec 016 AC2)', () => {
  for (const skill of CHESS_SKILLS) {
    for (const kind of skill.kinds) {
      it(`${skill.id} · ${kind}`, { timeout: 60_000 }, () => {
        const seeds = FROM_LISTS.has(kind) || skill.id === 'chess.special' ? LIST_SEEDS : SEEDS
        for (const difficulty of DIFFICULTIES) {
          for (let seed = 1; seed <= seeds; seed++) {
            const p = generatePuzzle(skill.id, { kind, difficulty, seed })
            expect(p.id).toBe(`${skill.id}:${difficulty}:${kind}:${seed}`)
            expect(generatePuzzle(skill.id, { kind, difficulty, seed })).toEqual(p)
            checkPuzzle(p)
          }
        }
      })
    }
  }

  it('fast geometry matches the rules engine on practice boards', () => {
    for (const type of ['r', 'b', 'q', 'k', 'n'] as const) {
      for (const from of ['a1', 'd4', 'h8', 'b7', 'g2'] as const) {
        const walls = new Set(['c3', 'd6', 'f4'].filter((s) => s !== from))
        const placed = Object.fromEntries(
          [...walls].map((s) => [s, { type: 'p' as const, color: 'w' as const }]),
        )
        const board = fromFen(boardFen({ ...placed, [from]: { type, color: 'w' } }), {
          free: true,
        })
        const engine = legalMoves(board, from)
          .map((m) => m.to)
          .sort()
        expect(geometryTargets(type, from, walls).sort(), `${type}${from}`).toEqual(engine)
      }
    }
  })

  it('a wrong board answer gets a hint, and an illegal one says why', () => {
    const p = generatePuzzle('chess.rook', { kind: 'reach', difficulty: 1, seed: 3 })
    const run = startRun(p)
    const from = p.marks.focus as Square
    const wrongTo = candidateMoves(p).find((m) => !(p.squares ?? []).includes(m.to))?.to
    expect(runMove(run, { from, to: wrongTo as Square })).toMatchObject({
      outcome: 'wrong',
      hint: 'Land right on the star!',
    })
    // A rook tried diagonally: the rules engine says why, in kid words.
    const fx = 'abcdefgh'.indexOf(from[0] ?? 'a')
    const fy = Number(from[1])
    const diag = `${'abcdefgh'[fx < 7 ? fx + 1 : fx - 1]}${fy < 8 ? fy + 1 : fy - 1}` as Square
    expect(runMove(run, { from, to: diag })).toMatchObject({
      outcome: 'wrong',
      illegal: 'not-how-it-moves',
      hint: 'The rook moves in straight lines.',
    })
  })
})

describe('hand-picked positions (spec 016 AC3)', () => {
  it.each(MATE_IN_ONE)('mate in one: %s', (fen) => {
    const p = fromFen(fen)
    expect(mateInOneMoves(p).length).toBeGreaterThan(0)
    expect(status(p).over).toBe(false)
  })

  /** White mates in two against every defence (and not in one). */
  function forcedMateInTwo(fen: string): boolean {
    const p = fromFen(fen)
    if (mateInOneMoves(p).length > 0) return false
    return legalMoves(p).some((m) => {
      const a = play(p, m)?.position
      if (!a || status(a).over) return false
      return legalMoves(a).every((r) => {
        const b = play(a, r)?.position
        return !!b && mateInOneMoves(b).length > 0
      })
    })
  }

  it.each([...MATE_QK, ...MATE_RK])('forced mate in two: %s', (fen) => {
    expect(forcedMateInTwo(fen)).toBe(true)
  })

  it('check lists are in check / not in check', () => {
    for (const fen of IN_CHECK) expect(status(fromFen(fen)).check, fen).toBe(true)
    for (const fen of NOT_IN_CHECK) expect(status(fromFen(fen)).check, fen).toBe(false)
  })

  it('mate-or-not and draw lists cover every answer', () => {
    const labels = MATE_OR_NOT.map((fen) => {
      const s = status(fromFen(fen))
      return s.checkmate ? 'mate' : s.stalemate ? 'stalemate' : s.check ? 'check' : 'none'
    })
    expect(new Set(labels)).toEqual(new Set(['mate', 'stalemate', 'check']))
    const draws = DRAW_OR_NOT.map((fen) => status(fromFen(fen)).draw !== null)
    expect(draws).toContain(true)
    expect(draws).toContain(false)
  })

  it('castling and special-move lists hold what they say', () => {
    const can = CAN_CASTLE.map((fen) => canMove(fromFen(fen), 'e1', 'g1'))
    expect(can).toContain(true)
    expect(can).toContain(false)
    for (const s of SPECIAL_MOVES) {
      expect(canMove(fromFen(s.fen), s.from as Square, s.to as Square), s.fen).toBe(true)
    }
  })
})
