import { useEffect, useEffectEvent } from 'react'
import { Link } from 'react-router'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import { useActivity } from '@/app/time'
import { useProfiles } from '@/data'
import { parseAvatar } from '@/domain'
import { Button3D, Kukoos, useReadAloud } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'
import { plural, REWARD_COPY } from './copy'

interface GoodnightProps {
  /** Today's active minutes, shown as a quiet "look what you did". */
  minutes: number
  /** Kids with chess can keep playing chess (spec 013 AC3). */
  onChess?: (() => void) | undefined
}

/**
 * The daily limit is reached (spec 008 AC8): a calm night sky, Kukoos asleep, no sound loop
 * and no math play button. The only way back to math is a grown-up's +10 behind the gate;
 * a kid who also learns chess is offered chess, which is open play (spec 013).
 */
export function Goodnight({ minutes, onChess }: GoodnightProps) {
  useActivity(null)
  const { profile } = useProfiles()
  const { readAloud } = useReadAloud()
  const speech = onChess
    ? `${REWARD_COPY.goodnightTitle} ${REWARD_COPY.chessOffer}`
    : `${REWARD_COPY.goodnightTitle} ${REWARD_COPY.goodnightBody}`
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
        {profile?.avatar && (
          <AvatarArt
            avatar={parseAvatar(profile.avatar)}
            size={96}
            className="goodnight__avatar"
            decorative
          />
        )}
        <Kukoos mood="sleep" size={140} />
        <span className="goodnight__zzz" aria-hidden="true">
          z z z
        </span>
      </div>
      <h1 className="goodnight__title">{REWARD_COPY.goodnightTitle}</h1>
      <p className="goodnight__body">
        {onChess ? REWARD_COPY.chessOffer : REWARD_COPY.goodnightBody}
      </p>
      <p className="goodnight__today">You did {plural(minutes, 'minute')} of space travel today.</p>
      {onChess && (
        <Button3D variant="primary" size="xl" onClick={onChess}>
          <span aria-hidden="true">♞</span> Play chess
        </Button3D>
      )}
      <Link to="/grown-ups" className="goodnight__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
