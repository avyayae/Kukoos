import { useEffect } from 'react'
import { speak } from '@/audio/tts'
import { EFFECT_SOUNDS, type RewardEffect } from '@/domain'
import { Button3D } from '@/ui'
import { useAutoFocus } from '@/ui/useAutoFocus'
import type { MomentCopy } from './copy'

interface RewardMomentProps {
  /** 1-based position in the queue. */
  step: number
  effect: RewardEffect
  copy: MomentCopy
  autoRead: boolean
  onContinue: () => void
}

/** One celebration at a time (spec 008 AC10): a big pop, a title, and the same CONTINUE. */
export function RewardMoment({ step, effect, copy, autoRead, onContinue }: RewardMomentProps) {
  const continueRef = useAutoFocus<HTMLButtonElement>()
  const speech = `${copy.title} ${copy.body}`
  useEffect(() => {
    if (autoRead) speak(speech)
  }, [autoRead, speech])

  return (
    <main
      className={`screen moment moment--${effect.type}`}
      data-testid="reward-moment"
      data-step={step}
      data-effect={effect.type}
      data-sound={EFFECT_SOUNDS[effect.type]}
    >
      <div className="moment__stage">
        <div className="moment__burst" aria-hidden="true" />
        <span className="moment__emoji" aria-hidden="true">
          {copy.emoji}
        </span>
      </div>
      <h1 className="moment__title">{copy.title}</h1>
      <p className="moment__body">{copy.body}</p>
      <div className="moment__action">
        <Button3D ref={continueRef} variant="primary" size="xl" block onClick={onContinue}>
          Continue
        </Button3D>
      </div>
    </main>
  )
}
