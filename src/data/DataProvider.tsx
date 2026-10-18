import { type ReactNode, useEffect, useState } from 'react'
import { createRepositories } from './createRepositories'
import { RepoContext } from './context'
import { ProfileProvider } from './ProfileProvider'
import type { Repositories } from './repositories/types'

interface DataProviderProps {
  /** Injected in tests; otherwise IndexedDB is opened on mount. */
  repos?: Repositories
  children: ReactNode
}

/** Makes the repositories available to the whole app (spec 004). */
export function DataProvider({ repos: injected, children }: DataProviderProps) {
  const [opened, setOpened] = useState<Repositories | null>(null)
  useEffect(() => {
    if (injected) return
    let alive = true
    void createRepositories().then((r) => {
      if (alive) setOpened(r)
    })
    return () => {
      alive = false
    }
  }, [injected])

  const repos = injected ?? opened
  // IndexedDB opens in a few milliseconds; render nothing until it's ready.
  if (!repos) return null
  return (
    <RepoContext value={repos}>
      <ProfileProvider>{children}</ProfileProvider>
    </RepoContext>
  )
}
