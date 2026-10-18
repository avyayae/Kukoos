import { useBadges, useJourney, useWallet } from '@/data'
import type { UnlockState } from '@/domain'

/** What the current kid has earned, for avatar items (spec 010: progress, never purchases). */
export function useUnlocks(): UnlockState {
  const wallet = useWallet()
  const badges = useBadges()
  const journey = useJourney()
  return {
    level: wallet?.wallet.level ?? 1,
    badges: new Set((badges ?? []).map((b) => b.badgeId)),
    bossesBeaten: journey?.bossesBeaten.size ?? 0,
  }
}
