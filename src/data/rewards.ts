import Dexie from 'dexie'
import {
  bossPassed,
  type SavedLesson,
  lessonRewards,
  localDate,
  NEW_WALLET,
  type RewardEffect,
  rollStreak,
  type SkillId,
  type StreakRoll,
  type Wallet,
} from '@/domain'
import type { KukoosDb } from './db'
import { bossesBeaten } from './journey'
import type { BadgeRow, WalletRow } from './rows'
import { dayId, readToday, timeSettings } from './time'
import { type NewRow, writeRows } from './write'

/** One wallet row per kid, keyed by the profile id. */
const toWallet = (row: WalletRow | undefined): Wallet =>
  row
    ? {
        xpTotal: row.xpTotal,
        level: row.level,
        gems: row.gems,
        streakCount: row.streakCount,
        streakFreezes: row.streakFreezes,
        lastGoalMetDate: row.lastGoalMetDate,
      }
    : NEW_WALLET

const walletRow = (profileId: string, w: Wallet): NewRow<'wallet'> => ({
  id: profileId,
  profileId,
  ...w,
})

export const badgeId = (profileId: string, badge: string) => `${profileId}:${badge}`

/** The kid's totals with missed days settled (freeze used or a new flame), saved once. */
export async function rollWallet(
  db: KukoosDb,
  profileId: string,
  at: number,
): Promise<{ wallet: Wallet; roll: StreakRoll }> {
  return db.transaction('rw', [db.wallet, db.outbox], async () => {
    const out = rollStreak(toWallet(await db.wallet.get(profileId)), localDate(at))
    if (out.roll.kind !== 'none')
      await writeRows(db, 'wallet', [walletRow(profileId, out.wallet)], at)
    return out
  })
}

export async function badgesFor(db: KukoosDb, profileId: string): Promise<BadgeRow[]> {
  const rows = await db.badges
    .where('[profileId+badgeId]')
    .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
    .toArray()
  return rows.sort((a, b) => a.unlockedAt - b.unlockedAt)
}

/**
 * Applies a just-saved lesson to the wallet, today's goal and badges (spec 008 AC7, AC9) and
 * returns the effects to celebrate. Runs inside the lesson-save transaction, after the
 * lesson and its progress were written, so the totals include this lesson.
 */
export async function applyLessonRewards(
  db: KukoosDb,
  state: SavedLesson,
  profileId: string,
  at: number,
): Promise<RewardEffect[]> {
  const [walletRowNow, today, settings, lessons, progress, owned, beaten] = await Promise.all([
    db.wallet.get(profileId),
    readToday(db, profileId, at),
    timeSettings(db, profileId),
    db.lessons.where('profileId').equals(profileId).toArray(),
    db.skillProgress
      .where('[profileId+skillId]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .toArray(),
    badgesFor(db, profileId),
    bossesBeaten(db, profileId),
  ])

  const firstTryCorrect = state.results.filter((r) => r.firstTry).length
  const completed = state.phase === 'complete'
  const goalJustMet = !today.goalMet && today.lessonSeconds >= settings.goalMin * 60
  const out = lessonRewards({
    summary: {
      completed,
      mode: state.mode,
      questionCount: state.results.length,
      firstTryCorrect,
      bestCombo: state.bestCombo,
      bossPassed:
        completed && state.mode === 'boss' && bossPassed(firstTryCorrect, state.results.length),
    },
    wallet: toWallet(walletRowNow),
    today: today.date,
    goalJustMet,
    goalMin: settings.goalMin,
    stats: {
      completedLessons: lessons.filter((l) => l.completed).length,
      perfectLessons: lessons.filter(
        (l) => l.completed && l.questionCount > 0 && l.firstTryCorrect === l.questionCount,
      ).length,
      firstTryAnswers: lessons.reduce((n, l) => n + l.firstTryCorrect, 0),
      // Pre-mastered (starting point) crowns weren't earned here: no badge without practice (§1.1).
      crowned: new Set<SkillId>(
        progress.filter((p) => p.crowned && !p.preMastered).map((p) => p.skillId),
      ),
      bossesBeaten: beaten.size,
    },
    ownedBadges: new Set(owned.map((b) => b.badgeId)),
  })

  await writeRows(db, 'wallet', [walletRow(profileId, out.wallet)], at)
  if (out.newBadges.length > 0) {
    await writeRows(
      db,
      'badges',
      out.newBadges.map((b) => ({
        id: badgeId(profileId, b),
        profileId,
        badgeId: b,
        unlockedAt: at,
      })),
      at,
    )
  }
  if (goalJustMet) {
    const { date, ...rest } = today
    await writeRows(
      db,
      'dailyActivity',
      [{ id: dayId(profileId, date), profileId, date, ...rest, goalMet: true }],
      at,
    )
  }
  return out.effects
}
