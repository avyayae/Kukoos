import Dexie from 'dexie'
import {
  applyLesson,
  applyStartingPoint,
  type LessonState,
  type Progress,
  type SkillId,
  type SkillMastery,
} from '@/domain'
import type { KukoosDb } from './db'
import type { SkillProgressRow } from './rows'
import { type NewRow, writeRows } from './write'

export const progressId = (profileId: string, skillId: SkillId) => `${profileId}:${skillId}`

export function rowToMastery(row: SkillProgressRow): SkillMastery {
  return {
    mastery: row.mastery,
    attempts: row.attempts,
    sessionsSeen: row.sessionsSeen,
    srsBox: row.srsBox,
    nextReviewAt: row.nextReviewAt,
    crowned: row.crowned,
    preMastered: row.preMastered ?? false,
  }
}

function masteryToRow(
  profileId: string,
  skillId: SkillId,
  m: SkillMastery,
): NewRow<'skillProgress'> {
  return { id: progressId(profileId, skillId), profileId, skillId, ...m }
}

export async function progressForProfile(db: KukoosDb, profileId: string): Promise<Progress> {
  const rows = await db.skillProgress
    .where('[profileId+skillId]')
    .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
    .toArray()
  return Object.fromEntries(rows.map((r) => [r.skillId, rowToMastery(r)]))
}

/**
 * Applies a lesson's answers to each skill it touched (spec 006 AC7). Call inside the
 * lesson-save transaction so the lesson and its progress are written together.
 */
export async function applyLessonProgress(
  db: KukoosDb,
  state: LessonState,
  profileId: string,
  at: number,
): Promise<void> {
  const bySkill = new Map<SkillId, LessonState['results'][number][]>()
  for (const r of state.results) {
    const list = bySkill.get(r.skillId) ?? []
    list.push(r)
    bySkill.set(r.skillId, list)
  }
  const ids = [...bySkill.keys()].map((s) => progressId(profileId, s))
  const existing = await db.skillProgress.bulkGet(ids)
  const rows = [...bySkill.entries()].map(([skillId, outcomes], i) => {
    const prev = existing[i]
    return masteryToRow(
      profileId,
      skillId,
      applyLesson(prev ? rowToMastery(prev) : undefined, outcomes, at),
    )
  })
  await writeRows(db, 'skillProgress', rows, at)
}

/** Pre-masters the starting point's prerequisites (never lowers progress). Returns how many changed. */
export async function applyStartingPointProgress(
  db: KukoosDb,
  profileId: string,
  startSkillId: SkillId,
  at: number,
): Promise<number> {
  return db.transaction('rw', [db.skillProgress, db.outbox], async () => {
    const current = await progressForProfile(db, profileId)
    const changes = applyStartingPoint(current, startSkillId, at)
    const rows = Object.entries(changes).map(([skillId, m]) =>
      masteryToRow(profileId, skillId, m as SkillMastery),
    )
    await writeRows(db, 'skillProgress', rows, at)
    return rows.length
  })
}
