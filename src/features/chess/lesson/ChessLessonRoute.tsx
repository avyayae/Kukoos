import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useProfiles, useProgress, useRepos } from '@/data'
import { chessDue, getChessSkill, isChessSkill } from '@/domain/chess/curriculum'
import { skipCheckPassed } from '@/domain/chess/lesson'
import { Button3D, Kukoos } from '@/ui'
import { CHESS_COPY } from '../copy'
import { ChessLessonScreen } from './ChessLessonScreen'

export const CHESS_REVIEW = 'review'

function parseSeed(raw: string | null): number {
  const s = Number(raw)
  return raw !== null && Number.isSafeInteger(s) && s >= 0 ? s : Date.now() % 1_000_000
}

type Stage = 'offer' | 'check' | 'passed' | 'failed' | 'lesson'

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
    <main className="screen chess-card" data-testid="chess-card">
      <Kukoos mood={mood} size={140} talks>
        <span>{body}</span>
      </Kukoos>
      <h1 className="chess-card__title">{title}</h1>
      <div className="chess-card__actions">{actions}</div>
    </main>
  )
}

/**
 * /chess/lesson/:skillId and /chess/lesson/review (spec 016). The first time a skill opens,
 * Kukoos offers "Already know this?": 3 hard puzzles, all right crowns the skill (AC6).
 */
export default function ChessLessonRoute() {
  const { skillId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loaded = useProgress()
  const repos = useRepos()
  const { profile } = useProfiles()
  const [seed] = useState(() => parseSeed(params.get('seed')))
  // Fixed for this visit (and `?now=` in dev/e2e builds), like the math lessons.
  const [now] = useState(() => clockNow(params))
  const [stage, setStage] = useState<Stage | null>(null)
  const home = () => navigate('/')

  const isReview = skillId === CHESS_REVIEW
  if (!isReview && !isChessSkill(skillId)) {
    return (
      <Card
        title="Hmm, Kukoos can’t find that one."
        body="Let’s go back to the castle."
        mood="think"
        actions={
          <Button3D variant="primary" size="xl" block onClick={home}>
            Back to the castle
          </Button3D>
        }
      />
    )
  }
  if (!loaded) return null
  const progress = loaded.progress

  if (isReview) {
    if (chessDue(progress, now).length === 0) {
      return (
        <Card
          title={CHESS_COPY.nothingToReview}
          body="Come back later to keep your crowns shiny."
          mood="happy"
          actions={
            <Button3D variant="primary" size="xl" block onClick={home}>
              Back to the castle
            </Button3D>
          }
        />
      )
    }
    return (
      <ChessLessonScreen
        skillId={chessDue(progress, now)[0] ?? 'chess.board'}
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
  const skill = getChessSkill(skillId)

  if (current === 'offer') {
    return (
      <Card
        title={CHESS_COPY.offerTitle}
        body={`${skill.intro} ${CHESS_COPY.offerBody}`}
        mood="happy"
        actions={
          <>
            <Button3D variant="primary" size="xl" block onClick={() => setStage('check')}>
              {CHESS_COPY.offerCheck}
            </Button3D>
            <Button3D variant="ghost" size="lg" block onClick={() => setStage('lesson')}>
              {CHESS_COPY.offerLearn}
            </Button3D>
          </>
        }
      />
    )
  }
  if (current === 'check') {
    return (
      <ChessLessonScreen
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
        title={CHESS_COPY.passedTitle}
        body={CHESS_COPY.passedBody}
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
        title={CHESS_COPY.failedTitle}
        body={`${skill.intro} ${CHESS_COPY.failedBody}`}
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
    <ChessLessonScreen
      key="lesson"
      skillId={skillId}
      seed={seed}
      progress={progress}
      onExit={home}
    />
  )
}
