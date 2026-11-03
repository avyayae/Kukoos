import { createRng, type Rng } from '../../rng'
import type { ChessPuzzleKind, SkillId } from '../../types'
import { getChessSkill } from '../curriculum'
import { PIECE_NAMES } from '../explain'
import { canMove, fromFen, legalMoves, pieceAt, play, status, withTurn } from '../position'
import { attackersOf, boardFen, mateInOneMoves, PIECE_VALUES } from '../teach'
import type { Piece, PieceType, Position, Square } from '../types'
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
} from './positions'
import type { Puzzle, PuzzleDifficulty } from './types'

const FILES = 'abcdefgh'
export const ALL_SQUARES: readonly Square[] = [...FILES].flatMap((f) =>
  [...'12345678'].map((r) => `${f}${r}` as Square),
)
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1'

const white = (type: PieceType): Piece => ({ type, color: 'w' })
const black = (type: PieceType): Piece => ({ type, color: 'b' })
const say = (sq: Square) => `${sq[0]} ${sq[1]}`
const free = (placed: Partial<Record<Square, Piece>>) => fromFen(boardFen(placed), { free: true })
const targetsFrom = (p: Position, from: Square) => legalMoves(p, from).map((m) => m.to)

/** The piece each Courtyard skill is about. */
const SKILL_PIECE: Partial<Record<SkillId, PieceType>> = {
  'chess.rook': 'r',
  'chess.bishop': 'b',
  'chess.queen': 'q',
  'chess.king': 'k',
  'chess.knight': 'n',
}

type Body = Omit<Puzzle, 'id' | 'skillId' | 'kind' | 'difficulty' | 'seed'>
type Gen = (skillId: SkillId, d: PuzzleDifficulty, rng: Rng) => Body | null

/** 1–2 of our own pawns in the way (they can't be jumped, except by knights). */
function walls(rng: Rng, n: number, taken: readonly Square[]): Partial<Record<Square, Piece>> {
  const out: Partial<Record<Square, Piece>> = {}
  const spots = ALL_SQUARES.filter((s) => !taken.includes(s) && s[1] !== '1' && s[1] !== '8')
  for (const sq of rng.shuffle(spots).slice(0, n)) out[sq] = white('p')
  return out
}

// ------------------------------------------------------------------ Courtyard

const reach: Gen = (skillId, d, rng) => {
  if (skillId === 'chess.pawn') return pawnReach(d, rng)
  const type = SKILL_PIECE[skillId] ?? 'r'
  const start = rng.pick(ALL_SQUARES)
  const position = free({ [start]: white(type), ...walls(rng, d === 1 ? 0 : d - 1, [start]) })
  const targets = targetsFrom(position, start)
  // Kings only step one square, so their stars are always next door.
  const far = targets.filter((t) => d === 1 || type === 'k' || distance(start, t) >= 2)
  if (far.length < 2) return null
  const star = rng.pick(far)
  const name = PIECE_NAMES[type]
  return {
    prompt: { text: `Move the ${name} to the star!`, speech: `Move the ${name} to the star!` },
    position,
    marks: { stars: [star], focus: start },
    squares: [star],
    solution: { move: { from: start, to: star } },
  }
}

function pawnReach(d: PuzzleDifficulty, rng: Rng): Body | null {
  const file = rng.pick([...FILES])
  const rank = d === 1 ? 2 : d === 2 ? rng.int(3, 6) : 7
  const start = `${file}${rank}` as Square
  const to = `${file}${d === 1 ? rng.pick([3, 4]) : rank + 1}` as Square
  const position = free({ [start]: white('p') })
  const text = d === 3 ? 'March the pawn to the end!' : 'Move the pawn to the star!'
  return {
    prompt: { text, speech: text },
    position,
    marks: { stars: [to], focus: start },
    squares: [to],
    solution: { move: d === 3 ? { from: start, to, promotion: 'q' } : { from: start, to } },
  }
}

const stars: Gen = (skillId, d, rng) => {
  const type = SKILL_PIECE[skillId] ?? 'r'
  const start = rng.pick(ALL_SQUARES)
  const blockers = walls(rng, d === 3 ? rng.int(1, 2) : 0, [start])
  const used = [start, ...(Object.keys(blockers) as Square[])]
  const starSquares = rng
    .shuffle(ALL_SQUARES.filter((s) => !used.includes(s)))
    .slice(0, d === 1 ? 2 : 3)
  const best = fewestMoves(type, start, blockers, starSquares)
  if (best === null || best > 6) return null
  const maxMoves = d === 1 ? best + 1 : best
  const text = `Collect all the stars in ${maxMoves} moves!`
  return {
    prompt: { text, speech: text },
    position: free({ [start]: white(type), ...blockers }),
    marks: { stars: starSquares, focus: start },
    maxMoves,
    solution: { move: { from: start, to: firstStep(type, start, blockers, starSquares) ?? start } },
  }
}

/** Breadth-first search over (square, stars collected): fewest moves to land on every star. */
function starSearch(
  type: PieceType,
  start: Square,
  blockers: Partial<Record<Square, Piece>>,
  starSquares: readonly Square[],
): { moves: number; first: Square | null } | null {
  const walled = new Set(Object.keys(blockers))
  const memo = new Map<Square, Square[]>()
  const next = (sq: Square) => {
    let t = memo.get(sq)
    if (!t) {
      t = geometryTargets(type, sq, walled)
      memo.set(sq, t)
    }
    return t
  }
  const full = (1 << starSquares.length) - 1
  const seen = new Set<string>([`${start}:0`])
  let frontier: { sq: Square; got: number; first: Square | null }[] = [
    { sq: start, got: 0, first: null },
  ]
  for (let moves = 1; moves <= 8; moves++) {
    const after: typeof frontier = []
    for (const node of frontier) {
      for (const to of next(node.sq)) {
        const i = starSquares.indexOf(to)
        const got = i >= 0 ? node.got | (1 << i) : node.got
        const first = node.first ?? to
        if (got === full) return { moves, first }
        const key = `${to}:${got}`
        if (seen.has(key)) continue
        seen.add(key)
        after.push({ sq: to, got, first })
      }
    }
    frontier = after
  }
  return null
}

const ROOK_DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const BISHOP_DIRS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const JUMPS: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
]

/**
 * Where a piece can go on a practice board whose other pieces are all its own (walls):
 * plain geometry, matching the rules engine there, and fast enough for search. A test
 * compares it with the engine.
 */
export function geometryTargets(
  type: PieceType,
  from: Square,
  walls: ReadonlySet<string>,
): Square[] {
  const fx = FILES.indexOf(from[0] ?? 'a')
  const fy = Number(from[1]) - 1
  const at = (x: number, y: number) =>
    x >= 0 && x < 8 && y >= 0 && y < 8 ? (`${FILES[x]}${y + 1}` as Square) : null
  const out: Square[] = []
  const slide = (dirs: readonly (readonly [number, number])[], max: number) => {
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= max; i++) {
        const sq = at(fx + dx * i, fy + dy * i)
        if (!sq || walls.has(sq)) break
        out.push(sq)
      }
    }
  }
  if (type === 'r' || type === 'q') slide(ROOK_DIRS, 7)
  if (type === 'b' || type === 'q') slide(BISHOP_DIRS, 7)
  if (type === 'k') slide([...ROOK_DIRS, ...BISHOP_DIRS], 1)
  if (type === 'n') {
    for (const [dx, dy] of JUMPS) {
      const sq = at(fx + dx, fy + dy)
      if (sq && !walls.has(sq)) out.push(sq)
    }
  }
  return out
}

export const fewestMoves = (...a: Parameters<typeof starSearch>) => starSearch(...a)?.moves ?? null
const firstStep = (...a: Parameters<typeof starSearch>) => starSearch(...a)?.first ?? null

const count: Gen = (skillId, d, rng) => {
  const type = SKILL_PIECE[skillId] ?? 'r'
  const start = rng.pick(ALL_SQUARES)
  const position = free({ [start]: white(type), ...walls(rng, d === 1 ? 0 : d - 1, [start]) })
  const answer = targetsFrom(position, start).length
  if (answer < 2) return null
  const others = rng
    .shuffle([answer - 2, answer - 1, answer + 1, answer + 2, answer + 3].filter((n) => n > 0))
    .slice(0, 3)
  const choices = [answer, ...others].sort((a, b) => a - b).map(String)
  const name = PIECE_NAMES[type]
  const text = `How many squares can the ${name} go to?`
  return {
    prompt: { text, speech: text },
    position,
    marks: { focus: start },
    choices,
    answer: String(answer),
    solution: { choice: String(answer) },
  }
}

const findSquare: Gen = (skillId, d, rng) => {
  if (skillId === 'chess.setup') return homeSquare(d, rng)
  const pool = d === 1 ? ALL_SQUARES.filter((s) => s[1] === '1' || s[0] === 'a') : ALL_SQUARES
  const sq = rng.pick(pool)
  return {
    prompt: { text: `Tap ${sq}!`, speech: `Tap ${say(sq)}!` },
    position: fromFen(EMPTY, { free: true }),
    marks: {},
    squares: [sq],
    solution: { square: sq },
  }
}

const HOMES: readonly { d: PuzzleDifficulty; piece: string; squares: Square[] }[] = [
  { d: 1, piece: 'white king', squares: ['e1'] },
  { d: 1, piece: 'white queen', squares: ['d1'] },
  { d: 1, piece: 'black king', squares: ['e8'] },
  { d: 1, piece: 'black queen', squares: ['d8'] },
  { d: 2, piece: 'a white rook', squares: ['a1', 'h1'] },
  { d: 2, piece: 'a white knight', squares: ['b1', 'g1'] },
  { d: 2, piece: 'a black rook', squares: ['a8', 'h8'] },
  { d: 2, piece: 'a black knight', squares: ['b8', 'g8'] },
  { d: 3, piece: 'a white bishop', squares: ['c1', 'f1'] },
  { d: 3, piece: 'a black bishop', squares: ['c8', 'f8'] },
  { d: 3, piece: 'a white pawn', squares: [...FILES].map((f) => `${f}2` as Square) },
  { d: 3, piece: 'a black pawn', squares: [...FILES].map((f) => `${f}7` as Square) },
]

function homeSquare(d: PuzzleDifficulty, rng: Rng): Body {
  const q = rng.pick(HOMES.filter((h) => h.d === d))
  const text = `Where does ${q.piece} start? Tap it!`
  return {
    prompt: { text, speech: text },
    position: fromFen(EMPTY, { free: true }),
    marks: {},
    squares: q.squares,
    solution: { square: q.squares[0] as Square },
  }
}

// ------------------------------------------------------------------ Towers

const capture: Gen = (skillId, d, rng) => {
  if (skillId === 'chess.pawn') return pawnCapture(d, rng)
  const type = rng.pick<PieceType>(['r', 'b', 'n', 'q'])
  const start = rng.pick(ALL_SQUARES)
  const reachable = targetsFrom(free({ [start]: white(type) }), start)
  const valueSets: PieceType[][] =
    d === 1
      ? [['n'], ['r'], ['q']]
      : d === 2
        ? [
            ['p', 'r'],
            ['n', 'q'],
            ['p', 'q'],
          ]
        : [
            ['p', 'n', 'r'],
            ['p', 'r', 'q'],
            ['n', 'r', 'q'],
          ]
  const victims = rng.pick(valueSets)
  const spots = rng.shuffle(reachable).slice(0, victims.length)
  if (spots.length < victims.length) return null
  const placed: Partial<Record<Square, Piece>> = { [start]: white(type) }
  victims.forEach((v, i) => (placed[spots[i] as Square] = black(v)))
  // d1: a decoy the piece can't reach.
  if (d === 1) {
    const decoy = rng.pick(ALL_SQUARES.filter((s) => !(s in placed) && !reachable.includes(s)))
    placed[decoy] = black('p')
  }
  const position = free(placed)
  const captures = legalMoves(position, start).filter((m) => m.capture)
  if (captures.length !== victims.length) return null
  const best = [...captures].sort(
    (a, b) => PIECE_VALUES[b.captured ?? 'p'] - PIECE_VALUES[a.captured ?? 'p'],
  )[0]
  if (!best) return null
  const name = PIECE_NAMES[type]
  const text =
    d === 1 ? `Capture the 🎯 piece with the ${name}!` : 'Capture the most valuable piece!'
  return {
    prompt: { text, speech: d === 1 ? `Capture the target with the ${name}!` : text },
    position,
    marks: d === 1 ? { target: best.to, focus: start } : { focus: start },
    squares: [best.to],
    solution: { move: { from: start, to: best.to } },
  }
}

function pawnCapture(d: PuzzleDifficulty, rng: Rng): Body | null {
  const f = rng.int(1, 6)
  const rank = rng.int(3, 6)
  const start = `${FILES[f]}${rank}` as Square
  const side = rng.pick([-1, 1])
  const target = `${FILES[f + side]}${rank + 1}` as Square
  const placed: Partial<Record<Square, Piece>> = {
    [start]: white('p'),
    [target]: black(rng.pick<PieceType>(['n', 'b', 'r'])),
  }
  if (d >= 2) placed[`${FILES[f]}${rank + 1}` as Square] = black('p')
  const text = 'Capture with the pawn!'
  return {
    prompt: { text, speech: text },
    position: free(placed),
    marks: { target, focus: start },
    squares: [target],
    solution: { move: { from: start, to: target } },
  }
}

const safe: Gen = (_skillId, d, rng) => {
  const type = rng.pick<PieceType>(['n', 'b', 'r'])
  const start = rng.pick(ALL_SQUARES)
  const placed: Partial<Record<Square, Piece>> = { [start]: white(type) }
  const enemies = rng.shuffle(ALL_SQUARES.filter((s) => s !== start)).slice(0, d === 1 ? 1 : 2)
  for (const sq of enemies) placed[sq] = black(rng.pick<PieceType>(['r', 'b', 'n']))
  const position = free(placed)
  const moves = legalMoves(position, start)
  const safeTo = moves
    .filter((m) => {
      const after = play(position, m)
      return after !== null && attackersOf(after.position, m.to, 'b').length === 0
    })
    .map((m) => m.to)
  if (safeTo.length === 0 || moves.length - safeTo.length < 2) return null
  const name = PIECE_NAMES[type]
  const text = `Move the ${name} to a safe square!`
  return {
    prompt: { text, speech: text },
    position,
    marks: { focus: start },
    squares: safeTo,
    solution: { move: { from: start, to: safeTo[0] as Square } },
  }
}

// ------------------------------------------------------------------ positions lists

function which(skillId: SkillId, rng: Rng): Body {
  if (skillId === 'chess.special') {
    const position = fromFen(rng.pick(CAN_CASTLE))
    const answer = canMove(position, 'e1', 'g1') ? 'Yes' : 'No'
    const text = 'Can White castle on the king’s side?'
    return choice(position, text, ['Yes', 'No'], answer)
  }
  if (skillId === 'chess.check') {
    const position = fromFen(rng.pick([...IN_CHECK, ...NOT_IN_CHECK]))
    const answer = status(position).check ? 'Check!' : 'No check'
    return choice(position, 'Is the king in check?', ['Check!', 'No check'], answer)
  }
  if (skillId === 'chess.draws') {
    const position = fromFen(rng.pick(DRAW_OR_NOT))
    const answer = status(position).draw ? 'Draw' : 'Not a draw'
    return choice(position, 'Is it a draw?', ['Draw', 'Not a draw'], answer)
  }
  const position = fromFen(rng.pick(MATE_OR_NOT))
  const st = status(position)
  const answer = st.checkmate ? 'Checkmate' : st.stalemate ? 'Stalemate' : 'Check'
  return choice(
    position,
    'Checkmate, check or stalemate?',
    ['Checkmate', 'Check', 'Stalemate'],
    answer,
  )
}

function choice(position: Position, text: string, choices: string[], answer: string): Body {
  return {
    prompt: { text, speech: text },
    position,
    marks: {},
    choices,
    answer,
    solution: { choice: answer },
  }
}

const escape: Gen = (_skillId, _d, rng) => {
  const position = fromFen(rng.pick(IN_CHECK))
  const first = legalMoves(position)[0]
  if (!first) return null
  return {
    prompt: { text: 'Save your king!', speech: 'Your king is in check. Save your king!' },
    position,
    marks: {},
    solution: { move: { from: first.from, to: first.to } },
  }
}

const special: Gen = (_skillId, _d, rng) => {
  const s = rng.pick(SPECIAL_MOVES)
  const position = fromFen(s.fen)
  const from = s.from as Square
  const to = s.to as Square
  if (!canMove(position, from, to)) return null
  return {
    prompt: { text: s.what, speech: s.what },
    position,
    marks: { stars: [to], focus: from },
    squares: [to],
    solution: { move: { from, to } },
  }
}

const mate1: Gen = (_skillId, _d, rng) => {
  const position = fromFen(rng.pick(MATE_IN_ONE))
  const first = mateInOneMoves(position)[0]
  if (!first) return null
  return {
    prompt: { text: 'Checkmate in one move!', speech: 'Find checkmate in one move!' },
    position,
    marks: {},
    solution: { move: { from: first.from, to: first.to } },
  }
}

const mateDrill: Gen = (skillId, _d, rng) => {
  const position = fromFen(rng.pick(skillId === 'chess.mateRK' ? MATE_RK : MATE_QK))
  const piece = skillId === 'chess.mateRK' ? 'rook' : 'queen'
  const first = legalMoves(position)[0]
  if (!first) return null
  const text = `Catch the king! Checkmate in 3 moves.`
  return {
    prompt: { text, speech: `Use your ${piece} and king. Checkmate in 3 moves!` },
    position,
    marks: {},
    maxMoves: 3,
    solution: { move: { from: first.from, to: first.to } },
  }
}

// ------------------------------------------------------------------ entry point

function distance(a: Square, b: Square): number {
  return Math.max(
    Math.abs(FILES.indexOf(a[0] ?? 'a') - FILES.indexOf(b[0] ?? 'a')),
    Math.abs(Number(a[1]) - Number(b[1])),
  )
}

function bodyFor(skillId: SkillId, kind: ChessPuzzleKind, d: PuzzleDifficulty, rng: Rng) {
  switch (kind) {
    case 'find':
      return findSquare(skillId, d, rng)
    case 'reach':
      return skillId === 'chess.special' ? special(skillId, d, rng) : reach(skillId, d, rng)
    case 'stars':
      return stars(skillId, d, rng)
    case 'count':
      return count(skillId, d, rng)
    case 'capture':
      return capture(skillId, d, rng)
    case 'safe':
      return safe(skillId, d, rng)
    case 'which':
      return which(skillId, rng)
    case 'escape':
      return escape(skillId, d, rng)
    case 'mate1':
      return mate1(skillId, d, rng)
    case 'mate':
      return mateDrill(skillId, d, rng)
  }
}

/**
 * One puzzle for a chess skill (spec 016 AC2). Deterministic for the same inputs; if a seed
 * gives an unusable board, the next sub-seed is tried.
 */
export function generatePuzzle(
  skillId: SkillId,
  options: { kind?: ChessPuzzleKind; difficulty: PuzzleDifficulty; seed: number },
): Puzzle {
  const skill = getChessSkill(skillId)
  const kind = options.kind ?? skill.kinds[0] ?? 'reach'
  if (!skill.kinds.includes(kind)) throw new Error(`${skillId} has no ${kind} puzzles`)
  const rng = createRng(options.seed)
  for (let attempt = 0; attempt < 60; attempt++) {
    const body = bodyFor(skillId, kind, options.difficulty, rng)
    if (body) {
      const position =
        body.position.free && pieceAt(body.position, body.marks.focus ?? 'a1')?.color === 'b'
          ? withTurn(body.position, 'b')
          : body.position
      return {
        id: `${skillId}:${options.difficulty}:${kind}:${options.seed}`,
        skillId,
        kind,
        difficulty: options.difficulty,
        seed: options.seed,
        ...body,
        position,
      }
    }
  }
  throw new Error(`No ${kind} puzzle for ${skillId} (seed ${options.seed})`)
}
