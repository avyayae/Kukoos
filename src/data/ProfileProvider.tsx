import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useRepos } from './context'
import { ProfileContext, type ProfileContextValue } from './profileContext'
import type { ProfileRow } from './rows'

/**
 * The current kid for the whole app (spec 010 AC5). Every data hook keys on this profile,
 * so picking another kid reloads progress, wallet, badges, time and the map in place.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const repos = useRepos()
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined)
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [picked, setPicked] = useState(false)

  const load = useCallback(async () => {
    try {
      const current = await repos.profiles.ensureCurrent()
      const all = await repos.profiles.list()
      setProfile(current)
      setProfiles(all)
    } catch {
      setProfile(null)
      setProfiles([])
    }
  }, [repos])

  useEffect(() => {
    let alive = true
    Promise.all([repos.profiles.ensureCurrent(), repos.profiles.list()])
      .then(([current, all]) => {
        if (!alive) return
        setProfile(current)
        setProfiles(all)
      })
      .catch(() => {
        if (alive) setProfile(null)
      })
    return () => {
      alive = false
    }
  }, [repos])

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      profiles,
      needsPick: profiles.length >= 2 && !picked,
      pick: async (id) => {
        await repos.profiles.setCurrent(id)
        setPicked(true)
        await load()
      },
      refresh: load,
    }),
    [profile, profiles, picked, repos, load],
  )
  return <ProfileContext value={value}>{children}</ProfileContext>
}
