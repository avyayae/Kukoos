import { useEffect, useState } from 'react'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import {
  firstTryAccuracy,
  getSkill,
  isSpaceWorld,
  type LessonState,
  lessonMinutes,
  type RewardEffect,
} from '@/domain'
import { momentFor } from '@/features/rewards/copy'
import { CountUp } from '@/features/rewards/CountUp'
import { RewardMoment } from '@/features/rewards/RewardMoment'
import { Button3D, Kukoos } from '@/ui'
import { useAutoFocus } from '@/ui/useAutoFocus'
import { t } from './copy'

interface LessonCompleteProps {
  state: LessonState
  /** The lesson's rewards; `null` while the save is still running. */
  effects: readonly RewardEffect[] | null
  autoRead: boolean
  onContinue: () => void
}

const XP_SOUND_DELAY_MS = 700

function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1'
  return String(Math.round(minutes))
}

/**
 * "Mission complete!" (spec 005 AC10) followed by the CelebrationOrchestrator (spec 008
 * AC10): XP and crystals count up on the summary, then each bigger moment (chest, badge,
 * level, goal, streak) gets its own screen, one at a time, with the same CONTINUE.
 */
export function LessonComplete({ state, effects, autoRead, onContinue }: LessonCompleteProps) {
  const [step, setStep] = useState(0)
  const moments = (effects ?? []).flatMap((effect) => {
    const copy = momentFor(effect)
    return copy ? [{ effect, copy }] : []
  })
  const next = () => (step < moments.length ? setStep(step + 1) : onContinue())

  const current = step > 0 ? moments[step - 1] : undefined
  if (current) {
    return (
      <RewardMoment
        key={step}
        step={step}
        effect={current.effect}
        copy={current.copy}
        autoRead={autoRead}
        onContinue={next}
      />
    )
  }
  return <Summary state={state} effects={effects} autoRead={autoRead} onContinue={next} />
}

function Summary({ state, effects, autoRead, onContinue }: LessonCompleteProps) {
  const title = t('lesson:complete')
  // Focus CONTINUE once it's enabled (rewards saved).
  const continueRef = useAutoFocus<HTMLButtonElement>(effects === null)
  useEffect(() => {
    if (autoRead) speak(title)
  }, [autoRead, title])

  const stats = [
    { icon: '🎯', label: 'First try', value: `${Math.round(firstTryAccuracy(state) * 100)}%` },
    { icon: '⏱', label: 'Minutes', value: formatMinutes(lessonMinutes(state)) },
    { icon: '🔥', label: 'Best combo', value: String(state.bestCombo) },
  ]
  const xp = effects?.find((e) => e.type === 'xpGained')
  const xpAmount = xp?.amount ?? 0
  // The XP sparkle follows the fanfare, while the numbers count up.
  useEffect(() => {
    if (xpAmount === 0) return
    const id = window.setTimeout(() => playSfx('xp'), XP_SOUND_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [xpAmount])
  const gems = effects?.find((e) => e.type === 'gemsGained')

  return (
    <main className="screen flex flex-col items-center justify-center gap-6 text-center">
      <Kukoos
        mood="cheer"
        size={160}
        talks
        helmet={isSpaceWorld(getSkill(state.question.skillId).worldId)}
      />
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
      {(xp || gems) && (
        <ul className="earned" aria-label="You earned" data-testid="earned">
          {xp && (
            <li className="earned__item earned__item--xp">
              <span aria-hidden="true">⭐</span>
              <CountUp value={xp.amount} prefix="+" />
              <span>XP</span>
            </li>
          )}
          {gems && (
            <li className="earned__item earned__item--gems">
              <span aria-hidden="true">💎</span>
              <CountUp value={gems.amount} prefix="+" />
              <span>crystals</span>
            </li>
          )}
        </ul>
      )}
      <div className="w-full max-w-sm">
        <Button3D
          ref={continueRef}
          variant="primary"
          size="xl"
          block
          disabled={effects === null}
          onClick={onContinue}
        >
          Continue
        </Button3D>
      </div>
    </main>
  )
}
