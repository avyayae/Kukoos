import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { CoursesValue } from '@/app/courses'
import { useActivity, useDailyTime } from '@/app/time'
import { cancelSpeech, speakParts } from '@/audio/tts'
import { useProfiles, useWallet } from '@/data'
import { HomeHeader } from '@/features/courses/HomeHeader'
import { BottomBar } from '@/features/map/BottomBar'
import { TopStats } from '@/features/rewards/TopStats'
import { Kukoos, useReadAloud, useSpeakOnTap } from '@/ui'
import { SPANISH_COPY } from './copy'

/**
 * The Spanish course home (spec 018): open play, like chess. The words arrive in F19 and
 * Hola Island in F20; until then Kukoos says hello in Spanish (with a Spanish voice).
 */
export default function SpanishHome({ courses }: { courses: CoursesValue }) {
  useActivity('spanish')
  const { profile } = useProfiles()
  const loadedWallet = useWallet()
  const time = useDailyTime()
  const navigate = useNavigate()
  const say = useSpeakOnTap()
  const { readAloud } = useReadAloud()
  const hello = () => speakParts([{ es: SPANISH_COPY.hello }, SPANISH_COPY.building])

  useEffect(() => {
    if (readAloud) speakParts([{ es: SPANISH_COPY.hello }, SPANISH_COPY.building])
    return cancelSpeech
  }, [readAloud])

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
        <span className="spanish-home__island" aria-hidden="true">
          🏝️
        </span>
        <button
          type="button"
          className="spanish-home__hello"
          aria-label={`${SPANISH_COPY.hello} ${SPANISH_COPY.building}`}
          data-testid="spanish-hello"
          onClick={hello}
        >
          <Kukoos mood="happy" size={120} talks>
            <span lang="es" className="spanish-home__word">
              {SPANISH_COPY.hello}
            </span>{' '}
            <span>{SPANISH_COPY.building}</span>
          </Kukoos>
        </button>
      </section>
      <div className="map-dock">
        <BottomBar
          home={{ icon: '🏝️', label: 'Island' }}
          onMap={hello}
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
