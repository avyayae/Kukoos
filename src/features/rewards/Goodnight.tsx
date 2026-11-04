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

/** An open-play course a kid can still switch to (specs 013 AC3, 020 AC6). */
export interface OpenPlayOffer {
  course: 'chess' | 'spanish'
  onOpen: () => void
}

const OFFER_BUTTON: Record<OpenPlayOffer['course'], { icon: string; label: string }> = {
  chess: { icon: '♞', label: 'Play chess' },
  spanish: { icon: '💬', label: 'Learn Spanish' },
}

interface GoodnightProps {
  /** Today's active minutes, shown as a quiet "look what you did". */
  minutes: number
  /** Open-play courses whose own limit isn't reached: offered instead of goodbye. */
  offers?: readonly OpenPlayOffer[]
}

function offerLine(offers: readonly OpenPlayOffer[]): string | null {
  const chess = offers.some((o) => o.course === 'chess')
  const spanish = offers.some((o) => o.course === 'spanish')
  if (chess && spanish) return REWARD_COPY.bothOffer
  if (chess) return REWARD_COPY.chessOffer
  if (spanish) return REWARD_COPY.spanishOffer
  return null
}

/**
 * The daily limit is reached (spec 008 AC8): a calm night sky, Kukoos asleep, no sound loop
 * and no math play button. The only way back to math is a grown-up's +10 behind the gate;
 * a kid who also learns chess or Spanish is offered them, as open play (specs 013, 020).
 */
export function Goodnight({ minutes, offers = [] }: GoodnightProps) {
  useActivity(null)
  const { profile } = useProfiles()
  const { readAloud } = useReadAloud()
  const offer = offerLine(offers)
  const speech = `${REWARD_COPY.goodnightTitle} ${offer ?? REWARD_COPY.goodnightBody}`
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
      <p className="goodnight__body">{offer ?? REWARD_COPY.goodnightBody}</p>
      <p className="goodnight__today">You did {plural(minutes, 'minute')} of space travel today.</p>
      {offers.map((o, i) => (
        <Button3D
          key={o.course}
          variant={i === 0 ? 'primary' : 'secondary'}
          size="xl"
          onClick={o.onOpen}
        >
          <span aria-hidden="true">{OFFER_BUTTON[o.course].icon}</span>{' '}
          {OFFER_BUTTON[o.course].label}
        </Button3D>
      ))}
      <Link to="/grown-ups" className="goodnight__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
