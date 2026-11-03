import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { type CoursesValue, useCourses } from '@/app/courses'
import { useActivity, useDailyTime } from '@/app/time'
import { useJourney, useProfiles, useWallet } from '@/data'
import { ChessHome, ChessRest } from '@/features/chess/ChessHome'
import { HomeHeader } from '@/features/courses/HomeHeader'
import { Onboarding } from '@/features/profiles/Onboarding'
import { WhoIsPlaying } from '@/features/profiles/WhoIsPlaying'
import { REWARD_COPY } from '@/features/rewards/copy'
import { Goodnight } from '@/features/rewards/Goodnight'
import { Notice } from '@/features/rewards/Notice'
import { TopStats } from '@/features/rewards/TopStats'
import {
  dueSkills,
  isSpaceWorld,
  type MapNode,
  mapNodes,
  type MissionTarget,
  nextMission,
} from '@/domain'
import { Kukoos, useSpeakOnTap } from '@/ui'
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
  const { profile, needsPick } = useProfiles()
  const courses = useCourses()
  const location = useLocation()
  // Several kids share the device: ask who's playing first (spec 010 AC6).
  if (needsPick) return <WhoIsPlaying />
  // A new kid makes their explorer before the first mission (spec 010 AC4).
  if (profile && profile.avatar === null) return <Onboarding />
  // A course switch cross-fades the new home (spec 013 UX).
  const fade = (location.state as { switched?: boolean } | null)?.switched === true
  const home = (node: ReactNode) =>
    fade ? (
      <div className="course-fade" key={courses.current}>
        {node}
      </div>
    ) : (
      node
    )
  // Chess is open play: only the optional grown-up limit rests it (spec 013).
  if (courses.current === 'chess') {
    return home(
      time.ready && time.chess.locked ? (
        <ChessRest courses={courses} />
      ) : (
        <ChessHome courses={courses} />
      ),
    )
  }
  // The math limit is reached: Kukoos sleeps until tomorrow (spec 008 AC8), but a kid with
  // chess can still play chess (spec 013 AC3).
  if (time.ready && time.budget.locked) {
    const chessOpen = courses.mine.includes('chess') && !time.chess.locked
    return (
      <Goodnight
        minutes={Math.floor((time.today?.totalSeconds ?? 0) / 60)}
        onChess={chessOpen ? () => void courses.choose('chess') : undefined}
      />
    )
  }
  return home(<JourneyMap courses={courses} />)
}

function JourneyMap({ courses }: { courses: CoursesValue }) {
  const journey = useJourney()
  const loadedWallet = useWallet()
  const time = useDailyTime()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const say = useSpeakOnTap()
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
  const here = nodes.find((n) => n.state === 'current')
  const inSpace = here ? isSpaceWorld(here.worldId) : false

  return (
    <main className="map-screen">
      <HomeHeader
        profile={journey.profile}
        fallback={<Kukoos mood="idle" size={44} talks helmet={inSpace} />}
        hello={`Hi ${nickname}! Tap a mission, or press play.`}
        courses={courses}
        stats={
          loadedWallet && (
            <TopStats
              wallet={loadedWallet.wallet}
              budget={time.budget}
              settings={time.settings}
              lessonSeconds={time.today?.lessonSeconds ?? 0}
              onSay={say}
            />
          )
        }
      />
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
