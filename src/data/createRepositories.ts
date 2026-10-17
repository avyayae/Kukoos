import { DB_NAME, openDb } from './db'
import { createDexieRepositories } from './repositories/dexie'
import { createNullRepositories } from './repositories/null'
import type { Repositories } from './repositories/types'

/** Opens IndexedDB; falls back to the no-op store if the browser won't let us (AC10). */
export async function createRepositories(name = DB_NAME): Promise<Repositories> {
  if (typeof indexedDB === 'undefined') return createNullRepositories()
  try {
    const db = openDb(name)
    await db.open()
    return createDexieRepositories(db)
  } catch {
    return createNullRepositories()
  }
}
