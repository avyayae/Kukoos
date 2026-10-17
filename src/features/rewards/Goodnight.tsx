import { useEffect, useEffectEvent } from 'react'
import { Link } from 'react-router'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import { useActivity } from '@/app/time'
import { Kukoos, useReadAloud } from '@/ui'
import { plural, REWARD_COPY } from './copy'

interface GoodnightProps {
  /** Today's active minutes, shown as a quiet "look what you did". */
  minutes: number
}

/**
 * The daily limit is reached (spec 008 AC8): a calm night sky, Kukoos asleep, no sound loop
 * and no play button. The only way on is a grown-up's +10 behind the gate.
 */
export function Goodnight({ minutes }: GoodnightProps) {
  useActivity(null)
  const { readAloud } = useReadAloud()
  const speech = `${REWARD_COPY.goodnightTitle} ${REWARD_COPY.goodnightBody}`
  const announce = useEffectEvent(() => {
    playSfx('lullaby')
    if (readAloud) speak(speech)
  })
  useEffect(() => announce(), [])

  return (
    <main className="screen goodnight" data-testid="goodnight">
      <div className="goodnight__sky" aria-hidden="true">
        <span className="goodnight__moon" />
      </div>
      <div className="goodnight__kukoos">
        <Kukoos mood="sleep" size={140} />
        <span className="goodnight__zzz" aria-hidden="true">
          z z z
        </span>
      </div>
      <h1 className="goodnight__title">{REWARD_COPY.goodnightTitle}</h1>
      <p className="goodnight__body">{REWARD_COPY.goodnightBody}</p>
      <p className="goodnight__today">You did {plural(minutes, 'minute')} of space travel today.</p>
      <Link to="/grown-ups" className="goodnight__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
