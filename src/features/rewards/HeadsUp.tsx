import { REWARD_COPY } from './copy'
import { Notice } from './Notice'

/**
 * A gentle, non-blocking heads-up when 2 minutes are left (spec 008). Shown and spoken
 * once per day (and again after a grown-up's +10, which changes `dayKey`).
 */
export function HeadsUp({ warn, dayKey }: { warn: boolean; dayKey: string }) {
  if (!warn) return null
  return <Notice key={dayKey} emoji="🌙" text={REWARD_COPY.headsUp} testId="heads-up" />
}
