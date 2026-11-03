import { createRng } from '@/domain'
import {
  legalMoves,
  type MoveInput,
  play,
  type Position,
  startPosition,
  status,
} from '@/domain/chess'
import { bestMove, type BotLevel, chooseMove } from '@/domain/chess/bot'

const input = (m: MoveInput): MoveInput =>
  m.promotion ? { from: m.from, to: m.to, promotion: m.promotion } : { from: m.from, to: m.to }

/** A seeded random walk from the start: `plies` random legal moves (stops early at the end). */
export function randomPosition(seed: number, plies: number): Position {
  const rng = createRng(seed)
  let p = startPosition()
  for (let i = 0; i < plies && !status(p).over; i++) {
    p = (play(p, input(rng.pick(legalMoves(p)))) as { position: Position }).position
  }
  return p
}

/** 0 = a random mover. */
export type Player = BotLevel | 0

/** A seeded game; 1 = White wins, 0 = Black wins, 0.5 = draw (or the move cap). */
export function botGame(white: Player, black: Player, seed: number, maxPlies = 200): number {
  const rng = createRng(seed)
  let p = startPosition()
  for (let ply = 0; ply < maxPlies; ply++) {
    const s = status(p)
    if (s.over) return s.winner === 'w' ? 1 : s.winner === 'b' ? 0 : 0.5
    const who = ply % 2 === 0 ? white : black
    const move = who === 0 ? input(rng.pick(legalMoves(p))) : bot(p, who, seed * 1000 + ply)
    const next = play(p, move)
    if (!next) throw new Error(`the bot played an illegal move: ${JSON.stringify(move)}`)
    p = next.position
  }
  return 0.5
}

/** `a`'s score (0–1) over `games` games against `b`, colours alternating. */
export function matchScore(a: Player, b: Player, games: number): number {
  let score = 0
  for (let i = 0; i < games; i++) {
    score += i % 2 === 0 ? botGame(a, b, i + 1) : 1 - botGame(b, a, i + 1)
  }
  return score / games
}

/** Kukoos's move in a live game (fails loudly if there is none). */
export function bot(p: Position, level: BotLevel, seed: number): MoveInput {
  const m = chooseMove(p, level, seed)
  if (!m) throw new Error(`no bot move in ${p.fen}`)
  return m
}

/** The hint move in a live game (fails loudly if there is none). */
export function hint(p: Position): MoveInput {
  const m = bestMove(p)
  if (!m) throw new Error(`no hint in ${p.fen}`)
  return m
}
