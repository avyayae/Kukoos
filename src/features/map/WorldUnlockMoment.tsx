import { useEffect, useEffectEvent, useState } from 'react'
import { type LoadedJourney, useRepos } from '@/data'
import { getWorld, type MapNode, type WorldId } from '@/domain'
import { useSpeakOnTap } from '@/ui'
import { openWorlds, WORLD_EMOJI } from './labels'

/**
 * The once-per-world celebration (spec 007 AC10, motion-design "unlock moment"). The first
 * map visit only records what's already open; later, a newly opened world gets the moment
 * (a rocket launch on the way to the Moon). Tap to dismiss; static under reduced motion.
 */
export function WorldUnlockMoment({
  journey,
  nodes,
}: {
  journey: LoadedJourney
  nodes: readonly MapNode[]
}) {
  const repos = useRepos()
  const say = useSpeakOnTap()
  const [dismissed, setDismissed] = useState(false)
  const open = openWorlds(nodes)
  const unseen = open.filter((w) => !journey.seenWorlds.includes(w))
  // The first map visit only records what's already open; later visits celebrate the newest world.
  const firstVisit = journey.seenWorlds.length === 0
  const celebrate = !firstVisit && unseen.length > 0 ? (unseen.at(-1) as WorldId) : null
  const showing = dismissed ? null : celebrate
  const profileId = journey.profile?.id
  const key = unseen.join(',')

  const record = useEffectEvent((worlds: WorldId[]) => {
    if (!profileId) return
    void repos.journey.markWorldsSeen(profileId, worlds)
    if (celebrate) say(`New world! ${getWorld(celebrate).title}`)
  })
  useEffect(() => {
    if (profileId && key) record(key.split(',') as WorldId[])
  }, [profileId, key])

  if (!showing) return null
  const world = getWorld(showing)
  return (
    <button
      type="button"
      className={`unlock-moment unlock-moment--${showing}`}
      data-testid="world-unlock"
      onClick={() => setDismissed(true)}
      aria-label={`New world: ${world.title}. Tap to continue.`}
    >
      {showing === 'moon' && (
        <span className="unlock-moment__rocket" aria-hidden="true">
          🚀
        </span>
      )}
      <span className="unlock-moment__card">
        <span className="unlock-moment__emoji" aria-hidden="true">
          {WORLD_EMOJI[showing]}
        </span>
        <span className="unlock-moment__title">New world!</span>
        <span className="unlock-moment__name">{world.title}</span>
      </span>
    </button>
  )
}
