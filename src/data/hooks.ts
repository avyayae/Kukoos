import { useEffect, useState } from 'react'
import {
  NEW_WALLET,
  type Progress,
  type SkillId,
  type StreakRoll,
  type Wallet,
  type WorldId,
} from '@/domain'
import { useRepos } from './context'
import { useProfiles } from './profileContext'
import type { Repositories } from './repositories/types'
import type { BadgeRow, ProfileRow } from './rows'

/** The current profile (created on first launch). `undefined` while loading, `null` without storage. */
export function useCurrentProfile(): ProfileRow | null | undefined {
  return useProfiles().profile
}

type Loader<T> = (repos: Repositories, profile: ProfileRow) => Promise<T>

/**
 * Loads data for the current kid and never shows another kid's data: results are keyed by
 * profile id, so right after "Who's playing?" switches kids the hook says "loading" instead
 * of briefly showing the previous kid's stars (spec 010 AC5).
 */
function useProfileData<T>(load: Loader<T>, onError: T, withoutStorage: T): T | undefined {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [state, setState] = useState<{ id: string; value: T } | null>(null)
  useEffect(() => {
    if (!profile) return
    let alive = true
    load(repos, profile)
      .then((value) => alive && setState({ id: profile.id, value }))
      .catch(() => alive && setState({ id: profile.id, value: onError }))
    return () => {
      alive = false
    }
  }, [repos, profile, load, onError])
  if (profile === null) return withoutStorage
  return state && profile && state.id === profile.id ? state.value : undefined
}

export interface LoadedProgress {
  profile: ProfileRow | null
  progress: Progress
}

const NO_PROGRESS: LoadedProgress = { profile: null, progress: {} }
const loadProgress: Loader<LoadedProgress> = async (repos, profile) => ({
  profile,
  progress: await repos.progress.forProfile(profile.id),
})

/** Mastery per skill for the current profile; `undefined` while loading (spec 006). */
export function useProgress(): LoadedProgress | undefined {
  return useProfileData(loadProgress, NO_PROGRESS, NO_PROGRESS)
}

export interface LoadedJourney extends LoadedProgress {
  bossesBeaten: ReadonlySet<WorldId>
  seenWorlds: readonly WorldId[]
}

const NO_JOURNEY: LoadedJourney = {
  profile: null,
  progress: {},
  bossesBeaten: new Set(),
  seenWorlds: [],
}
const loadJourney: Loader<LoadedJourney> = async (repos, profile) => {
  const [progress, bossesBeaten, seenWorlds] = await Promise.all([
    repos.progress.forProfile(profile.id),
    repos.journey.bossesBeaten(profile.id),
    repos.journey.seenWorlds(profile.id),
  ])
  return { profile, progress, bossesBeaten, seenWorlds }
}

/** Everything the map needs (spec 007); `undefined` while loading. */
export function useJourney(): LoadedJourney | undefined {
  return useProfileData(loadJourney, NO_JOURNEY, NO_JOURNEY)
}

export interface LoadedWallet {
  wallet: Wallet
  /** Missed days settled on this load (spec 008 AC3). */
  roll: StreakRoll
}

const EMPTY_WALLET: LoadedWallet = { wallet: NEW_WALLET, roll: { kind: 'none' } }
const loadWallet: Loader<LoadedWallet> = (repos, profile) => repos.rewards.wallet(profile.id)

/** XP, crystals and streak for the current profile; `undefined` while loading (spec 008). */
export function useWallet(): LoadedWallet | undefined {
  return useProfileData(loadWallet, EMPTY_WALLET, EMPTY_WALLET)
}

const NO_BADGES: BadgeRow[] = []
const loadBadges: Loader<BadgeRow[]> = (repos, profile) => repos.rewards.badges(profile.id)

/** Badges earned by the current profile (oldest first); `undefined` while loading. */
export function useBadges(): BadgeRow[] | undefined {
  return useProfileData(loadBadges, NO_BADGES, NO_BADGES)
}

const NO_SCORES: Partial<Record<SkillId, number>> = {}
const loadScores: Loader<Partial<Record<SkillId, number>>> = (repos, profile) =>
  repos.lessons.bestFirstTryBySkill(profile.id)

/** Best first-try score per skill for the current profile (empty while loading). */
export function useBestScores(): Partial<Record<SkillId, number>> {
  return useProfileData(loadScores, NO_SCORES, NO_SCORES) ?? NO_SCORES
}
