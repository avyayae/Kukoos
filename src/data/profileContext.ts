import { createContext, useContext } from 'react'
import type { ProfileRow } from './rows'

export interface ProfileContextValue {
  /** The kid playing now: `undefined` while loading, `null` when nothing can be saved. */
  profile: ProfileRow | null | undefined
  /** Every kid on this device, oldest first. */
  profiles: readonly ProfileRow[]
  /** True when 2+ kids share the device and nobody has picked who's playing this visit. */
  needsPick: boolean
  /** "It's me!": makes this kid current for the whole app (spec 010 AC5, AC6). */
  pick(id: string): Promise<void>
  /** Reloads after a profile was created, renamed or removed. */
  refresh(): Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue>({
  profile: undefined,
  profiles: [],
  needsPick: false,
  pick: () => Promise.resolve(),
  refresh: () => Promise.resolve(),
})

export function useProfiles(): ProfileContextValue {
  return useContext(ProfileContext)
}
