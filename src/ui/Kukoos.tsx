import type { ReactNode } from 'react'
import { KukoosArt } from './KukoosArt'
import { useSpeaking } from './useSpeech'

export type KukoosMood = 'idle' | 'happy' | 'cheer' | 'think' | 'encourage' | 'sleep' | 'fly'

interface KukoosProps {
  mood?: KukoosMood
  size?: number
  /** Changing this replays the mood animation (e.g. a new question id). */
  beat?: string | number
  /** Move the beak while speech is playing (spec 009 AC3). */
  talks?: boolean
  /** The space helmet, on the Moon and Mars (spec 009 AC4). */
  helmet?: boolean
  /** Speech bubble content next to Kukoos. */
  children?: ReactNode
}

/** Kukoos with a mood animation and an optional speech bubble (spec 009). */
export function Kukoos({
  mood = 'idle',
  size = 72,
  beat,
  talks = false,
  helmet = false,
  children,
}: KukoosProps) {
  const speaking = useSpeaking()
  const talking = talks && speaking && mood !== 'sleep'
  return (
    <div className="flex items-center gap-3">
      <span
        className={`kukoos kukoos--${mood}`}
        data-mood={mood}
        data-talking={talking || undefined}
        data-testid="kukoos"
        key={`${mood}:${beat ?? ''}`}
      >
        <KukoosArt size={size} helmet={helmet} />
      </span>
      {children && (
        <div className="bubble" data-testid="kukoos-bubble">
          {children}
        </div>
      )}
    </div>
  )
}
