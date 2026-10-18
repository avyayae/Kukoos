import Dexie from 'dexie'
import type { ParentReportInput } from '@/domain'
import type { KukoosDb } from './db'
import { progressForProfile } from './progress'

/** Everything the parent dashboard needs for one kid (spec 011 AC6), as plain records. */
export async function reportInput(
  db: KukoosDb,
  profileId: string,
  now: number,
): Promise<ParentReportInput> {
  const [attempts, lessons, days, progress, badges] = await Promise.all([
    db.attempts
      .where('[profileId+at]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .toArray(),
    db.lessons.where('profileId').equals(profileId).toArray(),
    db.dailyActivity
      .where('[profileId+date]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .toArray(),
    progressForProfile(db, profileId),
    db.badges
      .where('[profileId+badgeId]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .toArray(),
  ])
  return {
    attempts: attempts.map((a) => ({
      skillId: a.skillId,
      firstTry: a.firstTry,
      misconceptions: a.misconceptions,
      at: a.at,
    })),
    lessons: lessons.map((l) => ({
      skillId: l.skillId,
      mode: l.mode,
      completed: l.completed,
      endedAt: l.endedAt,
    })),
    days: days.map((d) => ({
      date: d.date,
      lessonSeconds: d.lessonSeconds,
      totalSeconds: d.totalSeconds,
    })),
    progress,
    badges: badges.map((b) => ({ badgeId: b.badgeId, unlockedAt: b.unlockedAt })),
    now,
  }
}
