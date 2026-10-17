import { createContext, useContext } from 'react'
import type { Repositories } from './repositories/types'

export const RepoContext = createContext<Repositories | null>(null)

/** The repositories for the current app (throws if DataProvider is missing). */
export function useRepos(): Repositories {
  const repos = useContext(RepoContext)
  if (!repos) throw new Error('useRepos must be used inside <DataProvider>')
  return repos
}
