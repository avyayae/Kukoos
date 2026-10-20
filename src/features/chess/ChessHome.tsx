import { Link, useNavigate } from 'react-router'
import type { CoursesValue } from '@/app/courses'
import { useActivity, useDailyTime } from '@/app/time'
import { useProfiles, useWallet } from '@/data'
import { CourseSwitcher } from '@/features/courses/CourseSwitcher'
import { HomeHeader } from '@/features/courses/HomeHeader'
import { BottomBar } from '@/features/map/BottomBar'
import { TopStats } from '@/features/rewards/TopStats'
import { Kukoos, useSpeakOnTap } from '@/ui'
import { CHESS_COPY } from './copy'

/**
 * The chess course home (spec 013). Chess is open play: no goal ring, streak or timer, only
 * the shared crystals and level. The lessons arrive in F16; until then it's a friendly sign.
 */
export function ChessHome({ courses }: { courses: CoursesValue }) {
  useActivity('chess')
  const { profile } = useProfiles()
  const loadedWallet = useWallet()
  const time = useDailyTime()
  const navigate = useNavigate()
  const say = useSpeakOnTap()

  return (
    <main className="map-screen chess-home" data-testid="chess-home">
      <HomeHeader
        profile={profile}
        fallback={<Kukoos mood="idle" size={44} talks />}
        hello={`Hi ${profile?.nickname ?? 'Explorer'}! Welcome to Chess Castle.`}
        courses={courses}
        stats={
          loadedWallet && (
            <TopStats
              wallet={loadedWallet.wallet}
              budget={time.budget}
              settings={time.settings}
              lessonSeconds={0}
              onSay={say}
              timed={false}
            />
          )
        }
      />
      <section className="chess-home__sign" aria-label="Chess Castle">
        <span className="chess-home__castle" aria-hidden="true">
          🏰
        </span>
        <Kukoos mood="happy" size={120} talks>
          <span>{CHESS_COPY.building}</span>
        </Kukoos>
      </section>
      <div className="map-dock">
        <BottomBar
          home={{ icon: '🏰', label: 'Castle' }}
          onMap={() => say(CHESS_COPY.building)}
          onTrophies={() => {
            say('Trophies')
            navigate('/trophies')
          }}
          onGrownUps={() => {
            say('Grown-ups')
            navigate('/grown-ups')
          }}
        />
      </div>
    </main>
  )
}

/** The optional chess limit is reached (spec 013): a calm rest, no timer, no guilt. */
export function ChessRest({ courses }: { courses: CoursesValue }) {
  useActivity(null)
  return (
    <main className="screen goodnight" data-testid="chess-rest">
      <div className="goodnight__sky" aria-hidden="true" />
      <div className="goodnight__kukoos">
        <Kukoos mood="sleep" size={140} />
      </div>
      <h1 className="goodnight__title">{CHESS_COPY.restingTitle}</h1>
      <p className="goodnight__body">{CHESS_COPY.resting}</p>
      <CourseSwitcher courses={courses} />
      <Link to="/grown-ups" className="goodnight__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
