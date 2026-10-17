import { useEffect, useState } from 'react'
import type { Progress, SkillId, WorldId } from '@/domain'
import { useRepos } from './context'
import type { ProfileRow } from './rows'

/** The current profile (created on first launch). `undefined` while loading, `null` without storage. */
export function useCurrentProfile(): ProfileRow | null | undefined {
  const repos = useRepos()
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    repos.profiles
      .ensureCurrent()
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
    return () => {
      alive = false
    }
  }, [repos])
  return profile
}

export interface LoadedProgress {
  profile: ProfileRow | null
  progress: Progress
}

/** Mastery per skill for the current profile; `undefined` while loading (spec 006). */
export function useProgress(): LoadedProgress | undefined {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [loaded, setLoaded] = useState<LoadedProgress | undefined>(undefined)
  useEffect(() => {
    if (!profile) return
    let alive = true
    repos.progress
      .forProfile(profile.id)
      .then((progress) => alive && setLoaded({ profile, progress }))
      .catch(() => alive && setLoaded({ profile, progress: {} }))
    return () => {
      alive = false
    }
  }, [repos, profile])
  if (profile === null) return { profile: null, progress: {} }
  return loaded
}

export interface LoadedJourney extends LoadedProgress {
  bossesBeaten: ReadonlySet<WorldId>
  seenWorlds: readonly WorldId[]
}

/** Everything the map needs (spec 007); `undefined` while loading. */
export function useJourney(): LoadedJourney | undefined {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [loaded, setLoaded] = useState<LoadedJourney | undefined>(undefined)
  useEffect(() => {
    if (!profile) return
    let alive = true
    Promise.all([
      repos.progress.forProfile(profile.id),
      repos.journey.bossesBeaten(profile.id),
      repos.journey.seenWorlds(profile.id),
    ])
      .then(([progress, beaten, seen]) => {
        if (alive) setLoaded({ profile, progress, bossesBeaten: beaten, seenWorlds: seen })
      })
      .catch(() => {
        if (alive) setLoaded({ profile, progress: {}, bossesBeaten: new Set(), seenWorlds: [] })
      })
    return () => {
      alive = false
    }
  }, [repos, profile])
  if (profile === null)
    return { profile: null, progress: {}, bossesBeaten: new Set(), seenWorlds: [] }
  return loaded
}

/** Best first-try score per skill for the current profile (empty while loading). */
export function useBestScores(): Partial<Record<SkillId, number>> {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [scores, setScores] = useState<Partial<Record<SkillId, number>>>({})
  useEffect(() => {
    if (!profile) return
    let alive = true
    repos.lessons
      .bestFirstTryBySkill(profile.id)
      .then((s) => alive && setScores(s))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [repos, profile])
  return scores
}
