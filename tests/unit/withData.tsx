import type { ReactNode } from 'react'
import {
  createDexieRepositories,
  createNullRepositories,
  DataProvider,
  type Repositories,
} from '@/data'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { ReadAloudProvider } from '@/ui'
import { freshDb } from './data/testDb'

/** A real (in-memory) Dexie store plus its repositories, for integration tests. */
export function testStore() {
  const db = freshDb()
  return { db, repos: createDexieRepositories(db) }
}

/** Wraps UI in a DataProvider (null store by default: nothing is saved). */
export function withData(ui: ReactNode, repos: Repositories = createNullRepositories()) {
  return (
    <DataProvider repos={repos}>
      <ReadAloudProvider>
        <GrownUpGateProvider>{ui}</GrownUpGateProvider>
      </ReadAloudProvider>
    </DataProvider>
  )
}
