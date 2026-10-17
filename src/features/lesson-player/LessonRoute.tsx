import { useNavigate, useParams, useSearchParams } from 'react-router'
import { type Difficulty, SKILLS } from '@/domain'
import { Button3D, Kukoos } from '@/ui'
import { t } from './copy'
import { LessonScreen } from './LessonScreen'

function parseDifficulty(raw: string | null): Difficulty {
  const d = Number(raw)
  return d >= 1 && d <= 5 && Number.isInteger(d) ? (d as Difficulty) : 2
}

function parseSeed(raw: string | null): number {
  const s = Number(raw)
  return raw !== null && Number.isSafeInteger(s) && s >= 0 ? s : Date.now() % 1_000_000
}

/** /lesson/:skillId?seed=&d= — seeded lessons are fully reproducible (used by e2e). */
export function LessonRoute() {
  const { skillId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const exit = () => navigate('/practice')

  if (!SKILLS.some((s) => s.id === skillId)) {
    return (
      <main className="screen flex flex-col items-center justify-center gap-6 text-center">
        <Kukoos mood="think" size={120} />
        <h1 className="font-display text-kid-2xl font-extrabold">{t('lesson:notFound')}</h1>
        <div className="w-full max-w-sm">
          <Button3D variant="primary" size="xl" block onClick={exit}>
            Pick a mission
          </Button3D>
        </div>
      </main>
    )
  }

  return (
    <LessonScreen
      key={`${skillId}:${params.get('seed') ?? ''}`}
      skillId={skillId}
      seed={parseSeed(params.get('seed'))}
      startDifficulty={parseDifficulty(params.get('d'))}
      onExit={exit}
    />
  )
}
