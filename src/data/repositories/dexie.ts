import type { SkillId } from '@/domain'
import { exportBackup, importBackup, tableCounts } from '../backup'
import type { KukoosDb } from '../db'
import { bossesBeaten, markWorldsSeen, seenWorlds } from '../journey'
import { lessonToRows } from '../mappers'
import { applyLessonProgress, applyStartingPointProgress, progressForProfile } from '../progress'
import { audioPrefs, saveAudioPrefs } from '../device'
import { isPersisted, requestPersistenceOnce } from '../persistence'
import {
  createProfile,
  listProfiles,
  removeProfile,
  setCurrentProfile,
  updateProfile,
} from '../profiles'
import { applyLessonRewards, badgesFor, rollWallet } from '../rewards'
import { addActive, addBonus, readToday, saveTimeSettings, timeSettings } from '../time'
import type { ProfileRow } from '../rows'
import { newId, writeRows } from '../write'
import type { Repositories } from './types'

export const DEFAULT_PROFILE = { nickname: 'Explorer', grade: 2 } as const
/** The device-level settings row. */
export const GLOBAL = 'global'
const DEVICE = 'device'

export function createDexieRepositories(db: KukoosDb, now: () => number = Date.now): Repositories {
  return {
    available: true,

    profiles: {
      ensureCurrent: () =>
        db.transaction('rw', [db.profiles, db.settings, db.outbox], async () => {
          const global = await db.settings.get(GLOBAL)
          const existing = global?.currentProfileId
            ? await db.profiles.get(global.currentProfileId)
            : undefined
          if (existing) return existing
          const at = now()
          const id = newId()
          const profile: Omit<ProfileRow, 'updatedAt' | 'version'> = {
            id,
            profileId: id,
            nickname: DEFAULT_PROFILE.nickname,
            grade: DEFAULT_PROFILE.grade,
            avatar: null,
            createdAt: at,
          }
          await writeRows(db, 'profiles', [profile], at)
          await writeRows(
            db,
            'settings',
            [{ ...global, id: GLOBAL, profileId: DEVICE, currentProfileId: id }],
            at,
          )
          return (await db.profiles.get(id)) ?? null
        }),
      list: () => listProfiles(db),
      create: (input) => createProfile(db, input, now()),
      update: (id, patch) => updateProfile(db, id, patch, now()),
      setCurrent: (id) => setCurrentProfile(db, id, now()),
      remove: (id) => removeProfile(db, id, now()),
    },

    lessons: {
      save: async (state, meta) => {
        if (state.results.length === 0) return []
        const at = now()
        const tables = [
          db.lessons,
          db.attempts,
          db.skillProgress,
          db.wallet,
          db.badges,
          db.dailyActivity,
          db.settings,
          db.outbox,
        ]
        return db.transaction('rw', tables, async () => {
          // Idempotency first, so a re-save never double-counts progress or rewards.
          if (await db.lessons.get(meta.lessonId)) return []
          const { lesson, attempts } = lessonToRows(state, meta, at)
          await writeRows(db, 'lessons', [lesson], at)
          await writeRows(db, 'attempts', attempts, at)
          await applyLessonProgress(db, state, meta.profileId, at)
          return applyLessonRewards(db, state, meta.profileId, at)
        })
      },

      bestFirstTryBySkill: async (profileId) => {
        const lessons = await db.lessons.where('profileId').equals(profileId).toArray()
        const best: Partial<Record<SkillId, number>> = {}
        for (const l of lessons) {
          if (!l.completed || l.questionCount === 0 || (l.mode !== undefined && l.mode !== 'skill'))
            continue
          const score = Math.round((l.firstTryCorrect / l.questionCount) * 100)
          best[l.skillId] = Math.max(best[l.skillId] ?? 0, score)
        }
        return best
      },
    },

    progress: {
      forProfile: (profileId) => progressForProfile(db, profileId),
      applyStartingPoint: (profileId, skillId) =>
        applyStartingPointProgress(db, profileId, skillId, now()),
    },

    journey: {
      bossesBeaten: (profileId) => bossesBeaten(db, profileId),
      seenWorlds: (profileId) => seenWorlds(db, profileId),
      markWorldsSeen: (profileId, worlds) => markWorldsSeen(db, profileId, worlds, now()),
    },

    time: {
      today: (profileId) => readToday(db, profileId, now()),
      addActive: (profileId, lessonSeconds, totalSeconds) =>
        addActive(db, profileId, lessonSeconds, totalSeconds, now()),
      addBonus: (profileId, minutes) => addBonus(db, profileId, minutes, now()),
      settings: (profileId) => timeSettings(db, profileId),
      setSettings: (profileId, settings) => saveTimeSettings(db, profileId, settings, now()),
    },

    rewards: {
      wallet: (profileId) => rollWallet(db, profileId, now()),
      badges: (profileId) => badgesFor(db, profileId),
    },

    device: {
      audio: () => audioPrefs(db),
      setAudio: (prefs) => saveAudioPrefs(db, prefs, now()),
    },

    backup: {
      export: () => exportBackup(db, now),
      import: (file) => importBackup(db, file),
      counts: () => tableCounts(db),
    },

    storage: {
      requestPersistence: () => requestPersistenceOnce(db, now),
      isPersisted: () => isPersisted(),
    },
  }
}
