import { bossPassed, type WorldId } from '@/domain'
import type { KukoosDb } from './db'
import { writeRows } from './write'

/** Worlds whose boss challenge this kid passed (spec 007 AC3). */
export async function bossesBeaten(db: KukoosDb, profileId: string): Promise<Set<WorldId>> {
  const lessons = await db.lessons.where('profileId').equals(profileId).toArray()
  return new Set(
    lessons
      .filter(
        (l) =>
          l.mode === 'boss' &&
          l.completed &&
          l.worldId &&
          bossPassed(l.firstTryCorrect, l.questionCount),
      )
      .map((l) => l.worldId as WorldId),
  )
}

/** Worlds whose unlock moment was already shown to this kid (spec 007 AC10). */
export async function seenWorlds(db: KukoosDb, profileId: string): Promise<WorldId[]> {
  return (await db.settings.get(profileId))?.seenWorlds ?? []
}

export async function markWorldsSeen(
  db: KukoosDb,
  profileId: string,
  worlds: readonly WorldId[],
  at: number,
): Promise<void> {
  if (worlds.length === 0) return
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    const row = await db.settings.get(profileId)
    const seen = new Set([...(row?.seenWorlds ?? []), ...worlds])
    await writeRows(
      db,
      'settings',
      [{ ...row, id: profileId, profileId, seenWorlds: [...seen] }],
      at,
    )
  })
}
