import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useActivity, useDailyTime } from '@/app/time'
import { useJourney, useWallet } from '@/data'
import { REWARD_COPY } from '@/features/rewards/copy'
import { Goodnight } from '@/features/rewards/Goodnight'
import { Notice } from '@/features/rewards/Notice'
import { TopStats } from '@/features/rewards/TopStats'
import { dueSkills, type MapNode, mapNodes, type MissionTarget, nextMission } from '@/domain'
import { cancelSpeech } from '@/audio/tts'
import { KukoosPlaceholder, useReadAloud, useSpeakOnTap } from '@/ui'
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion'
import { BottomBar } from './BottomBar'
import { JourneyCanvas } from './JourneyCanvas'
import { missionName, nodeSpeech, routeFor, targetOf } from './labels'
import { MissionSheet } from './MissionSheet'
import { PlayNextButton } from './PlayNextButton'
import { WorldUnlockMoment } from './WorldUnlockMoment'

/**
 * Home (spec 007): the journey map with one obvious next step. Everything a kid can tap
 * speaks its name, so reading is optional.
 */
export function MapScreen() {
  const time = useDailyTime()
  // The daily limit is reached: Kukoos sleeps until tomorrow (spec 008 AC8).
  if (time.ready && time.budget.locked) {
    return <Goodnight minutes={Math.floor((time.today?.totalSeconds ?? 0) / 60)} />
  }
  return <JourneyMap />
}

function JourneyMap() {
  const journey = useJourney()
  const loadedWallet = useWallet()
  const time = useDailyTime()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const say = useSpeakOnTap()
  const { readAloud, setReadAloud } = useReadAloud()
  const reduced = usePrefersReducedMotion()
  const [selected, setSelected] = useState<MapNode | null>(null)
  const scrolled = useRef(false)
  useActivity('map')

  // Glide to the current node once the map is ready (motion-design: one opening moment).
  useEffect(() => {
    if (!journey || scrolled.current) return
    scrolled.current = true
    const el = document.querySelector<HTMLElement>('[data-current]')
    el?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [journey, reduced])

  if (!journey) return null
  const roll = loadedWallet?.roll
  const now = clockNow(params)
  const input = { progress: journey.progress, bossesBeaten: journey.bossesBeaten, now }
  const nodes = mapNodes(input)
  const next = nextMission(input)
  const dueCount = dueSkills(journey.progress, now).length
  // Keep dev/e2e test-clock params when starting lessons.
  const search = params.toString() ? `?${params.toString()}` : ''
  const go = (target: MissionTarget) => navigate(`${routeFor(target)}${search}`)
  const nickname = journey.profile?.nickname ?? 'Explorer'

  return (
    <main className="map-screen">
      <header className="map-header">
        <KukoosPlaceholder size={44} />
        <button
          type="button"
          className="map-header__hello"
          onClick={() => say(`Hi ${nickname}! Tap a mission, or press play.`)}
        >
          <h1 className="map-header__title">Hi, {nickname}!</h1>
        </button>
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label={readAloud ? 'Turn off reading aloud' : 'Turn on reading aloud'}
          aria-pressed={readAloud}
          onClick={() => {
            if (readAloud) cancelSpeech()
            setReadAloud(!readAloud)
          }}
        >
          {readAloud ? '🔊' : '🔇'}
        </button>
        {loadedWallet && (
          <TopStats
            wallet={loadedWallet.wallet}
            budget={time.budget}
            settings={time.settings}
            lessonSeconds={time.today?.lessonSeconds ?? 0}
            onSay={say}
          />
        )}
      </header>
      {roll?.kind === 'frozen' && (
        <Notice emoji="🧊" text={REWARD_COPY.frozen} testId="streak-notice" />
      )}
      {roll?.kind === 'reset' && (
        <Notice emoji="🔥" text={REWARD_COPY.newFlame} testId="streak-notice" />
      )}

      <JourneyCanvas
        nodes={nodes}
        onSelect={(node) => {
          setSelected(node)
          say(nodeSpeech(node))
        }}
      />

      <div className="map-dock">
        <PlayNextButton
          target={next}
          onPlay={() => {
            say(missionName(next))
            go(next)
          }}
        />
        <BottomBar
          dueCount={dueCount}
          onMap={() => {
            say('Map')
            document
              .querySelector<HTMLElement>('[data-current]')
              ?.scrollIntoView?.({ block: 'center' })
          }}
          onReview={() => {
            if (dueCount === 0) {
              say('Nothing to review right now. Great job!')
              return
            }
            say('Review')
            go({ type: 'review' })
          }}
          onTrophies={() => {
            say('Trophies')
            navigate(`/trophies${search}`)
          }}
          onGrownUps={() => {
            say('Grown-ups')
            navigate('/grown-ups')
          }}
        />
      </div>

      <MissionSheet
        node={selected}
        onPlay={(node) => go(targetOf(node))}
        onClose={() => setSelected(null)}
      />
      <WorldUnlockMoment journey={journey} nodes={nodes} />
    </main>
  )
}
