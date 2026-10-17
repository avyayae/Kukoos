import { type ReactElement, type ReactNode, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useDailyTime } from '@/app/time'
import { useProgress } from '@/data'
import {
  composeBoss,
  composeLesson,
  composeReview,
  type Difficulty,
  SKILLS,
  WORLDS,
} from '@/domain'
import { Goodnight } from '@/features/rewards/Goodnight'
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
 * The daily limit is checked once, when the lesson starts (spec 008 AC8): a mission that
 * is already running always finishes, even if the limit is reached on the way.
 */
function LockedAtStart({
  locked,
  seconds,
  children,
}: {
  locked: boolean
  seconds: number
  children: ReactNode
}) {
  const [atStart] = useState(locked)
  return atStart ? <Goodnight minutes={Math.floor(seconds / 60)} /> : children
}

/**
 * /lesson/:skillId, /lesson/review and /lesson/boss/:worldId build the lesson from saved
 * progress (specs 006, 007). `?seed=` makes it reproducible, `?d=` overrides the start
 * difficulty, and `?now=` sets the clock in dev/e2e builds. Exits return to the map.
 */
export function LessonRoute() {
  const { skillId = '', worldId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loaded = useProgress()
  const time = useDailyTime()
  const [seed] = useState(() => parseSeed(params.get('seed')))
  // Keep dev/e2e test-clock params on the way back to the map.
  const exit = () => navigate({ pathname: '/', search: params.toString() })

  const isReview = skillId === REVIEW_ROUTE_ID
  const bossWorld = WORLDS.find((w) => w.id === worldId)
  if (worldId && !bossWorld) return <Message text={t('lesson:notFound')} onBack={exit} />
  if (!bossWorld && !isReview && !SKILLS.some((s) => s.id === skillId)) {
    return <Message text={t('lesson:notFound')} onBack={exit} />
  }
  // The plan depends on progress, so wait for it (a few ms) before starting.
  if (!loaded || !time.ready) return null
  const now = clockNow(params)
  const guard = (lesson: ReactElement) => (
    <LockedAtStart locked={time.budget.locked} seconds={time.today?.totalSeconds ?? 0}>
      {lesson}
    </LockedAtStart>
  )

  if (bossWorld) {
    const plan = composeBoss(bossWorld.id, seed)
    return guard(
      <LessonScreen
        key={`boss:${bossWorld.id}:${seed}`}
        skillId={plan[0]?.skillId ?? ''}
        seed={seed}
        plan={plan}
        mode="boss"
        worldId={bossWorld.id}
        startDifficulty={3}
        onExit={exit}
      />,
    )
  }

  if (isReview) {
    const plan = composeReview(loaded.progress, now, seed)
    const first = plan[0]
    if (!first) return <Message text={t('lesson:nothingToReview')} onBack={exit} />
    return guard(
      <LessonScreen
        key={`review:${seed}`}
        skillId={first.skillId}
        seed={seed}
        plan={plan}
        mode="review"
        onExit={exit}
      />,
    )
  }

  const composed = composeLesson({ focusSkillId: skillId, progress: loaded.progress, now, seed })
  return guard(
    <LessonScreen
      key={`${skillId}:${seed}`}
      skillId={skillId}
      seed={seed}
      plan={composed.plan}
      startDifficulty={parseDifficulty(params.get('d')) ?? composed.startDifficulty}
      onExit={exit}
    />,
  )
}
