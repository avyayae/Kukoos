import { Link, useNavigate, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import type { CoursesValue } from '@/app/courses'
import { useActivity, useDailyTime } from '@/app/time'
import { useProfiles, useProgress, useWallet } from '@/data'
import { chessDue, getChessSkill, nextChessSkill } from '@/domain/chess/curriculum'
import { CourseSwitcher } from '@/features/courses/CourseSwitcher'
import { HomeHeader } from '@/features/courses/HomeHeader'
import { BottomBar } from '@/features/map/BottomBar'
import { TopStats } from '@/features/rewards/TopStats'
import { Kukoos, useSpeakOnTap } from '@/ui'
import { CastleMap } from './CastleMap'
import { CHESS_COPY } from './copy'

/**
 * Chess Castle, the chess course home (specs 013, 016). Open play: no goal ring, streak or
 * timer, only the shared crystals and level. One obvious next step (Play next), plus
 * Review for crowned skills that are due.
 */
export function ChessHome({ courses }: { courses: CoursesValue }) {
  useActivity('chess')
  const { profile } = useProfiles()
  const loadedWallet = useWallet()
  const loaded = useProgress()
  const time = useDailyTime()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const say = useSpeakOnTap()
  if (!loaded) return null
  const progress = loaded.progress
  const now = clockNow(params)
  const next = nextChessSkill(progress)
  const due = chessDue(progress, now).length
  const open = (skillId: string, title: string) => {
    say(title)
    navigate(`/chess/lesson/${skillId}`)
  }

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
      <CastleMap
        progress={progress}
        onOpen={(node) => {
          if (node.state === 'locked') {
            say(`${node.skill.title}. Not yet! Get a crown in the one before first.`)
            return
          }
          open(node.skill.id, node.skill.title)
        }}
        onGame={() => say(CHESS_COPY.comingSoon)}
      />
      <div className="map-dock">
        {next ? (
          <button
            type="button"
            className="btn3d btn3d--primary btn3d--xl btn3d--block play-next"
            aria-label={`Play next: ${getChessSkill(next).title}`}
            data-testid="play-next"
            onClick={() => open(next, getChessSkill(next).title)}
          >
            <span className="play-next__icon" aria-hidden="true">
              ▶
            </span>
            <span className="play-next__text">
              <span className="play-next__label">Play next:</span>{' '}
              <span className="play-next__name">{getChessSkill(next).title}</span>
            </span>
          </button>
        ) : (
          <p className="chess-home__done">{CHESS_COPY.comingSoon}</p>
        )}
        <BottomBar
          home={{ icon: '🏰', label: 'Castle' }}
          dueCount={due}
          onMap={() => {
            say('Castle')
            document
              .querySelector<HTMLElement>('.castle [data-current]')
              ?.scrollIntoView?.({ block: 'center' })
          }}
          onReview={() => {
            if (due === 0) {
              say(CHESS_COPY.nothingToReview)
              return
            }
            say('Review')
            navigate('/chess/lesson/review')
          }}
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
