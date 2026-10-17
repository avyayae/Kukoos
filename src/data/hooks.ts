import { useEffect, useState } from 'react'
import type { SkillId } from '@/domain'
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
