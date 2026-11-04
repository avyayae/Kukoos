import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useProfiles, useProgress, useRepos } from '@/data'
import { speakParts } from '@/audio/tts'
import {
  FIESTA,
  fiestaOpen,
  getSpanishSkill,
  isSpanishSkill,
  spanishDue,
} from '@/domain/spanish/curriculum'
import { skipCheckPassed } from '@/domain/spanish/lesson'
import { Button3D, Kukoos } from '@/ui'
import { SPANISH_COPY } from '../copy'
import { SpanishLessonScreen } from './SpanishLessonScreen'

export const SPANISH_REVIEW = 'review'

function parseSeed(raw: string | null): number {
  const s = Number(raw)
  return raw !== null && Number.isSafeInteger(s) && s >= 0 ? s : Date.now() % 1_000_000
}

type Stage = 'offer' | 'check' | 'passed' | 'failed' | 'lesson' | 'fiesta'

/** A full-screen Kukoos card (offer, passed, failed): the same layout as chess. */
function Card({
  title,
  body,
  mood,
  actions,
}: {
  title: string
  body: string
  mood: 'happy' | 'cheer' | 'encourage' | 'think'
  actions: React.ReactNode
}) {
  return (
    <main className="screen chess-card spanish-card" data-testid="spanish-card">
      <Kukoos mood={mood} size={140} talks>
        <span>{body}</span>
      </Kukoos>
      <h1 className="chess-card__title">{title}</h1>
      <div className="chess-card__actions">{actions}</div>
    </main>
  )
}

/**
 * /spanish/lesson/:skillId and /spanish/lesson/review (spec 019). The first time a skill
 * opens, Kukoos offers "Already know these words?": 3 hard listening questions, all right
 * crowns the skill (AC7).
 */
export default function SpanishLessonRoute() {
  const { skillId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loaded = useProgress()
  const repos = useRepos()
  const { profile } = useProfiles()
  const [seed] = useState(() => parseSeed(params.get('seed')))
  const [now] = useState(() => clockNow(params))
  const [stage, setStage] = useState<Stage | null>(null)
  const home = () => navigate('/')
  const back = (
    <Button3D variant="primary" size="xl" block onClick={home}>
      Back to the island
    </Button3D>
  )

  const isReview = skillId === SPANISH_REVIEW
  const isFiesta = skillId === FIESTA
  // Has this kid finished a fiesta before? Known before the lesson starts (spec 020 AC4).
  const [hadFiesta, setHadFiesta] = useState<boolean | null>(null)
  useEffect(() => {
    if (!isFiesta || !profile) return
    void repos.lessons
      .bestFirstTryBySkill(profile.id)
      .then((scores) => setHadFiesta(scores[FIESTA] !== undefined))
  }, [isFiesta, profile, repos])

  if (!isReview && !isFiesta && !isSpanishSkill(skillId)) {
    return (
      <Card
        title="Hmm, Kukoos can’t find that one."
        body="Let’s go back to the island."
        mood="think"
        actions={back}
      />
    )
  }
  if (!loaded) return null
  const progress = loaded.progress

  if (isFiesta) {
    if (!fiestaOpen(progress)) {
      return (
        <Card
          title={SPANISH_COPY.fiestaTitle}
          body={SPANISH_COPY.fiestaNotYet}
          mood="encourage"
          actions={back}
        />
      )
    }
    if (stage === 'fiesta') return <FiestaMoment onDone={home} />
    return (
      <SpanishLessonScreen
        skillId={FIESTA}
        seed={seed}
        progress={progress}
        fiesta
        onExit={home}
        onFinished={() => (hadFiesta === false ? setStage('fiesta') : home())}
      />
    )
  }

  if (isReview) {
    const due = spanishDue(progress, now)
    if (due.length === 0) {
      return (
        <Card
          title={SPANISH_COPY.nothingToReview}
          body="Come back later to keep your crowns shiny."
          mood="happy"
          actions={back}
        />
      )
    }
    return (
      <SpanishLessonScreen
        skillId={due[0] ?? 'es.hello'}
        seed={seed}
        progress={progress}
        mode="review"
        onExit={home}
      />
    )
  }

  // First visit to a skill: offer the check. `?learn` skips the offer (tests, replays).
  const firstTime = !progress[skillId] && !params.has('learn')
  const current: Stage = stage ?? (firstTime ? 'offer' : 'lesson')
  const skill = getSpanishSkill(skillId)

  if (current === 'offer') {
    return (
      <Card
        title={SPANISH_COPY.offerTitle}
        body={`${skill.intro} ${SPANISH_COPY.offerBody}`}
        mood="happy"
        actions={
          <>
            <Button3D variant="primary" size="xl" block onClick={() => setStage('check')}>
              {SPANISH_COPY.offerCheck}
            </Button3D>
            <Button3D variant="ghost" size="lg" block onClick={() => setStage('lesson')}>
              {SPANISH_COPY.offerLearn}
            </Button3D>
          </>
        }
      />
    )
  }
  if (current === 'check') {
    return (
      <SpanishLessonScreen
        key="check"
        skillId={skillId}
        seed={seed}
        progress={progress}
        skipCheck
        onDone={(done) => {
          if (skipCheckPassed(done) && profile) {
            void repos.progress.markMastered(profile.id, skillId).finally(() => setStage('passed'))
          } else {
            setStage('failed')
          }
        }}
        onExit={home}
      />
    )
  }
  if (current === 'passed') {
    return (
      <Card
        title={SPANISH_COPY.passedTitle}
        body={SPANISH_COPY.passedBody}
        mood="cheer"
        actions={
          <Button3D variant="primary" size="xl" block onClick={home}>
            Continue
          </Button3D>
        }
      />
    )
  }
  if (current === 'failed') {
    return (
      <Card
        title={SPANISH_COPY.failedTitle}
        body={`${skill.intro} ${SPANISH_COPY.failedBody}`}
        mood="encourage"
        actions={
          <Button3D variant="primary" size="xl" block onClick={() => setStage('lesson')}>
            Let’s go!
          </Button3D>
        }
      />
    )
  }
  return (
    <SpanishLessonScreen
      key="lesson"
      skillId={skillId}
      seed={seed}
      progress={progress}
      onExit={home}
    />
  )
}

/** The first finished fiesta (spec 020 AC4): the island throws a party, once. */
function FiestaMoment({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    speakParts([{ es: SPANISH_COPY.fiestaTitle }, SPANISH_COPY.fiestaBody])
  }, [])
  return (
    <main className="screen moment fiesta-moment" data-testid="fiesta-moment">
      <div className="moment__stage">
        <div className="moment__burst" aria-hidden="true" />
        <div className="moment__emoji" aria-hidden="true">
          🪅
        </div>
      </div>
      <h1 className="moment__title" lang="es">
        {SPANISH_COPY.fiestaTitle}
      </h1>
      <p className="fiesta-moment__friends" aria-hidden="true">
        🦁 🐵 🐶 🐮 🦒 🐢
      </p>
      <p className="moment__body">{SPANISH_COPY.fiestaBody}</p>
      <div className="moment__action">
        <Button3D variant="primary" size="xl" block onClick={onDone}>
          Back to the island
        </Button3D>
      </div>
    </main>
  )
}
