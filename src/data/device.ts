import { type AudioPrefs, DEFAULT_AUDIO } from '@/audio/prefs'
import type { KukoosDb } from './db'
import { writeRows } from './write'

/** The device-level settings row (shared with `currentProfileId`). */
const GLOBAL = 'global'
const DEVICE = 'device'

export async function audioPrefs(db: KukoosDb): Promise<AudioPrefs> {
  const row = await db.settings.get(GLOBAL)
  return {
    readAloud: row?.readAloud ?? DEFAULT_AUDIO.readAloud,
    soundOn: row?.soundOn ?? DEFAULT_AUDIO.soundOn,
    volume: row?.volume ?? DEFAULT_AUDIO.volume,
    voiceURI: row?.voiceURI ?? DEFAULT_AUDIO.voiceURI,
    speechRate: row?.speechRate ?? DEFAULT_AUDIO.speechRate,
  }
}

export async function saveAudioPrefs(db: KukoosDb, prefs: AudioPrefs, at: number): Promise<void> {
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    const row = await db.settings.get(GLOBAL)
    await writeRows(db, 'settings', [{ ...row, id: GLOBAL, profileId: DEVICE, ...prefs }], at)
  })
}
