import { useEffect } from 'react'
import { speak } from '@/audio/tts'
import { firstTryAccuracy, type LessonState, lessonMinutes } from '@/domain'
import { Button3D, Kukoos } from '@/ui'
import { useAutoFocus } from '@/ui/useAutoFocus'
import { t } from './copy'

interface LessonCompleteProps {
  state: LessonState
  autoRead: boolean
  onContinue: () => void
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1'
  return String(Math.round(minutes))
}

/** "Mission complete!" with first-try accuracy, minutes and best combo (spec 005 AC10). */
export function LessonComplete({ state, autoRead, onContinue }: LessonCompleteProps) {
  const title = t('lesson:complete')
  const continueRef = useAutoFocus<HTMLButtonElement>()
  useEffect(() => {
    if (autoRead) speak(title)
  }, [autoRead, title])

  const stats = [
    { icon: '🎯', label: 'First try', value: `${Math.round(firstTryAccuracy(state) * 100)}%` },
    { icon: '⏱', label: 'Minutes', value: formatMinutes(lessonMinutes(state)) },
    { icon: '🔥', label: 'Best combo', value: String(state.bestCombo) },
  ]

  return (
    <main className="screen flex flex-col items-center justify-center gap-6 text-center">
      <Kukoos mood="cheer" size={160} />
      <h1 className="font-display text-kid-3xl leading-tight font-extrabold text-primary">
        {title}
      </h1>
      <ul className="stats" aria-label="Lesson results">
        {stats.map((s) => (
          <li key={s.label} className="stat">
            <span className="stat__icon" aria-hidden="true">
              {s.icon}
            </span>
            <span className="stat__value num">{s.value}</span>
            <span className="stat__label">{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="w-full max-w-sm">
        <Button3D ref={continueRef} variant="primary" size="xl" block onClick={onContinue}>
          Continue
        </Button3D>
      </div>
    </main>
  )
}
