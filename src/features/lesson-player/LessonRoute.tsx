import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useProgress } from '@/data'
import { composeLesson, composeReview, type Difficulty, SKILLS } from '@/domain'
import { Button3D, Kukoos } from '@/ui'
import { t } from './copy'
import { LessonScreen } from './LessonScreen'

export const REVIEW_ROUTE_ID = 'review'

function parseDifficulty(raw: string | null): Difficulty | undefined {
  const d = Number(raw)
  return raw !== null && d >= 1 && d <= 5 && Number.isInteger(d) ? (d as Difficulty) : undefined
}

function parseSeed(raw: string | null): number {
  const s = Number(raw)
  return raw !== null && Number.isSafeInteger(s) && s >= 0 ? s : Date.now() % 1_000_000
}

function Message({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <main className="screen flex flex-col items-center justify-center gap-6 text-center">
      <Kukoos mood="think" size={120} />
      <h1 className="font-display text-kid-2xl font-extrabold">{text}</h1>
      <div className="w-full max-w-sm">
        <Button3D variant="primary" size="xl" block onClick={onBack}>
          Pick a mission
        </Button3D>
      </div>
    </main>
  )
}

/**
 * /lesson/:skillId (or /lesson/review) builds the lesson from saved progress (spec 006):
 * kinds by mastery, due reviews, stretch. `?seed=` makes it reproducible, `?d=` overrides
 * the start difficulty, and `?now=` sets the clock in dev/e2e builds.
 */
export function LessonRoute() {
  const { skillId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loaded = useProgress()
  const [seed] = useState(() => parseSeed(params.get('seed')))
  const exit = () => navigate('/practice')

  const isReview = skillId === REVIEW_ROUTE_ID
  if (!isReview && !SKILLS.some((s) => s.id === skillId)) {
    return <Message text={t('lesson:notFound')} onBack={exit} />
  }
  // The plan depends on progress, so wait for it (a few ms) before starting.
  if (!loaded) return null
  const now = clockNow(params)

  if (isReview) {
    const plan = composeReview(loaded.progress, now, seed)
    const first = plan[0]
    if (!first) return <Message text={t('lesson:nothingToReview')} onBack={exit} />
    return (
      <LessonScreen
        key={`review:${seed}`}
        skillId={first.skillId}
        seed={seed}
        plan={plan}
        mode="review"
        onExit={exit}
      />
    )
  }

  const composed = composeLesson({ focusSkillId: skillId, progress: loaded.progress, now, seed })
  return (
    <LessonScreen
      key={`${skillId}:${seed}`}
      skillId={skillId}
      seed={seed}
      plan={composed.plan}
      startDifficulty={parseDifficulty(params.get('d')) ?? composed.startDifficulty}
      onExit={exit}
    />
  )
}
