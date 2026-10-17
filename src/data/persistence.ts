import type { KukoosDb } from './db'
import { writeRows } from './write'

const storageApi = (): StorageManager | undefined =>
  typeof navigator !== 'undefined' ? navigator.storage : undefined

/** Whether the browser promised to keep our data; null when it can't say. */
export async function isPersisted(): Promise<boolean | null> {
  const storage = storageApi()
  if (!storage?.persisted) return null
  try {
    return await storage.persisted()
  } catch {
    return null
  }
}

/**
 * Asks for persistent storage at most once per device (spec 004 AC9); the request is
 * remembered in the global settings row so we don't nag the browser every lesson.
 */
export async function requestPersistenceOnce(db: KukoosDb, now: () => number): Promise<boolean> {
  const global = await db.settings.get('global')
  if (global?.persistenceRequested) return (await isPersisted()) ?? false
  let granted = false
  const storage = storageApi()
  if (storage?.persist) {
    try {
      granted = await storage.persist()
    } catch {
      granted = false
    }
  }
  await writeRows(
    db,
    'settings',
    [{ ...global, id: 'global', profileId: 'device', persistenceRequested: true }],
    now(),
  )
  return granted
}
