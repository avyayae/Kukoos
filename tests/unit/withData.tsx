import type { ReactNode } from 'react'
import {
  createDexieRepositories,
  createNullRepositories,
  DataProvider,
  type Repositories,
} from '@/data'
import { AudioProvider } from '@/app/AudioProvider'
import { DEFAULT_AVATAR } from '@/domain'
import { TimeProvider } from '@/app/TimeProvider'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { freshDb } from './data/testDb'

/**
 * A real (in-memory) Dexie store plus its repositories, for integration tests. By default the
 * first kid has already made an explorer (spec 010), so screens open straight onto the map;
 * pass `{ onboarded: false }` to test the first-run flow.
 */
export function testStore({ onboarded = true } = {}) {
  const db = freshDb()
  const repos = createDexieRepositories(db)
  if (onboarded) {
    const ensure = repos.profiles.ensureCurrent
    repos.profiles.ensureCurrent = async () => {
      const profile = await ensure()
      if (!profile || profile.avatar !== null) return profile
      await repos.profiles.update(profile.id, { avatar: DEFAULT_AVATAR })
      return { ...profile, avatar: DEFAULT_AVATAR }
    }
  }
  return { db, repos }
}

/** Wraps UI in a DataProvider (null store by default: nothing is saved). */
export function withData(ui: ReactNode, repos: Repositories = createNullRepositories()) {
  return (
    <DataProvider repos={repos}>
      <AudioProvider>
        <GrownUpGateProvider>
          <TimeProvider>{ui}</TimeProvider>
        </GrownUpGateProvider>
      </AudioProvider>
    </DataProvider>
  )
}
