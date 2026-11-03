import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import type { CoursesValue } from '@/app/courses'
import { useActivity, useDailyTime } from '@/app/time'
import { cancelSpeech, isSpeechSupported, speakParts } from '@/audio/tts'
import { useProfiles, useProgress, useWallet } from '@/data'
import { getSpanishSkill, nextSpanishSkill, spanishDue } from '@/domain/spanish/curriculum'
import { HomeHeader } from '@/features/courses/HomeHeader'
import { BottomBar } from '@/features/map/BottomBar'
import { TopStats } from '@/features/rewards/TopStats'
import { Kukoos, useReadAloud, useSpeakOnTap } from '@/ui'
import { SPANISH_COPY } from './copy'
import { SpanishPath } from './SpanishPath'

/**
 * The Spanish course home (specs 018, 019): open play, like chess. Kukoos says hello in
 * Spanish, then the skills wait on a path (Hola Island's map arrives in F20), with one
 * obvious next step (Play next) and Review for crowned skills that are due.
 */
export default function SpanishHome({ courses }: { courses: CoursesValue }) {
  useActivity('spanish')
  const { profile } = useProfiles()
  const loadedWallet = useWallet()
  const loaded = useProgress()
  const time = useDailyTime()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const say = useSpeakOnTap()
  const { readAloud } = useReadAloud()
  const [canHear] = useState(isSpeechSupported)
  const hello = () => speakParts([{ es: SPANISH_COPY.hello }, SPANISH_COPY.building])

  useEffect(() => {
    if (readAloud) speakParts([{ es: SPANISH_COPY.hello }, SPANISH_COPY.building])
    return cancelSpeech
  }, [readAloud])

  const progress = loaded?.progress ?? {}
  const next = nextSpanishSkill(progress)
  const due = spanishDue(progress, clockNow(params)).length
  const open = (skillId: string) => {
    say(getSpanishSkill(skillId).title)
    navigate(`/spanish/lesson/${skillId}`)
  }

  return (
    <main className="map-screen spanish-home" data-testid="spanish-home">
      <HomeHeader
        profile={profile}
        fallback={<Kukoos mood="idle" size={44} talks />}
        hello={SPANISH_COPY.welcome(profile?.nickname ?? 'Explorer')}
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
      <section className="spanish-home__sign" aria-label="Hola Island">
        <button
          type="button"
          className="spanish-home__hello"
          aria-label={`${SPANISH_COPY.hello} ${SPANISH_COPY.building}`}
          data-testid="spanish-hello"
          onClick={hello}
        >
          <Kukoos mood="happy" size={72} talks>
            <span lang="es" className="spanish-home__word">
              {SPANISH_COPY.hello}
            </span>{' '}
            <span>{SPANISH_COPY.building}</span>
          </Kukoos>
        </button>
        {!canHear && (
          <p className="spanish-home__note" data-testid="spanish-no-speech">
            🔇 {SPANISH_COPY.noSpeech}
          </p>
        )}
      </section>
      {loaded && (
        <SpanishPath
          progress={progress}
          onOpen={(node) => {
            if (node.state === 'locked') {
              say(SPANISH_COPY.lockedNode(node.skill.title))
              return
            }
            open(node.skill.id)
          }}
        />
      )}
      <div className="map-dock">
        {next && (
          <button
            type="button"
            className="btn3d btn3d--primary btn3d--xl btn3d--block play-next"
            aria-label={`Play next: ${getSpanishSkill(next).title}`}
            data-testid="play-next"
            onClick={() => open(next)}
          >
            <span className="play-next__icon" aria-hidden="true">
              ▶
            </span>
            <span className="play-next__text">
              <span className="play-next__label">Play next:</span>{' '}
              <span className="play-next__name">{getSpanishSkill(next).title}</span>
            </span>
          </button>
        )}
        <BottomBar
          home={{ icon: '🏝️', label: 'Island' }}
          dueCount={due}
          onMap={() => {
            say('Island')
            document
              .querySelector<HTMLElement>('.spanish-path [data-current]')
              ?.scrollIntoView?.({ block: 'center' })
          }}
          onReview={() => {
            if (due === 0) {
              say(SPANISH_COPY.nothingToReview)
              return
            }
            say('Review')
            navigate('/spanish/lesson/review')
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
