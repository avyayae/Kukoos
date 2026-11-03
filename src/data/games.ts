import { type GameOutcome, gameRewards, type RewardEffect } from '@/domain'
import type { GameResult } from '@/domain/chess'
import type { BotLevel } from '@/domain/chess/bot'
import type { KukoosDb } from './db'
import { toWallet, walletRow } from './rewards'
import type { GameRow } from './rows'
import { type NewRow, writeRows } from './write'

/** A game as the game screen hands it over; the write path stamps the sync fields. */
export type SavedGame = NewRow<'games'>

const outcomeOf = (result: GameResult): GameOutcome =>
  result === 'win' || result === 'loss' || result === 'ended' ? result : 'draw'

const levelOf = (row: Pick<GameRow, 'opponent'>): BotLevel =>
  Number(row.opponent.slice(4)) as BotLevel

async function gamesOf(db: KukoosDb, profileId: string): Promise<GameRow[]> {
  return db.games.where('profileId').equals(profileId).toArray()
}

/** The kid's game still being played, newest first (spec 017 "Keep playing your game?"). */
export async function unfinishedGame(db: KukoosDb, profileId: string): Promise<GameRow | null> {
  const open = (await gamesOf(db, profileId)).filter((g) => g.endedAt === null)
  return open.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
}

/**
 * Saves the game as it is now (after every move). A kid has at most one unfinished game:
 * starting another stops the old one (`ended`, no rewards).
 */
export async function saveGame(db: KukoosDb, game: SavedGame, at: number): Promise<void> {
  await db.transaction('rw', [db.games, db.outbox], async () => {
    const existing = await db.games.get(game.id)
    if (existing?.endedAt != null) return
    const others = (await gamesOf(db, game.profileId)).filter(
      (g) => g.endedAt === null && g.id !== game.id,
    )
    const stopped = others.map((g) => ({ ...g, result: 'ended' as const, endedAt: at }))
    await writeRows(db, 'games', [...stopped, { ...game, result: null, endedAt: null }], at)
  })
}

/**
 * Saves the final result once and returns the rewards to celebrate (spec 017 AC6, AC7).
 * Finishing an already finished game returns `[]`, so nothing is counted twice.
 */
export async function finishGame(
  db: KukoosDb,
  game: SavedGame,
  result: GameResult,
  at: number,
): Promise<RewardEffect[]> {
  return db.transaction('rw', [db.games, db.wallet, db.outbox], async () => {
    const existing = await db.games.get(game.id)
    if (existing?.endedAt != null) return []
    const earlier = await gamesOf(db, game.profileId)
    const firstWinAtLevel = !earlier.some(
      (g) => g.id !== game.id && g.opponent === game.opponent && g.result === 'win',
    )
    await writeRows(db, 'games', [{ ...game, result, endedAt: at }], at)
    const { wallet, effects } = gameRewards({
      outcome: outcomeOf(result),
      kidMoves: game.kidMoves,
      firstWinAtLevel,
      wallet: toWallet(await db.wallet.get(game.profileId)),
    })
    if (effects.length > 0) await writeRows(db, 'wallet', [walletRow(game.profileId, wallet)], at)
    return effects
  })
}

/** The Kukoos levels this kid has beaten (the castle crown, the next-level nudge). */
export async function gameWins(db: KukoosDb, profileId: string): Promise<Set<BotLevel>> {
  const won = (await gamesOf(db, profileId)).filter((g) => g.result === 'win')
  return new Set(won.map(levelOf))
}
