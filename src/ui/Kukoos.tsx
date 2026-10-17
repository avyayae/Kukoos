import type { ReactNode } from 'react'
import { KukoosPlaceholder } from './KukoosPlaceholder'

export type KukoosMood = 'idle' | 'happy' | 'cheer' | 'think' | 'encourage' | 'sleep'

interface KukoosProps {
  mood?: KukoosMood
  size?: number
  /** Changing this replays the mood animation (e.g. a new question id). */
  beat?: string | number
  /** Speech bubble content next to Kukoos. */
  children?: ReactNode
}

/** Kukoos with a mood animation and an optional speech bubble (Rive version arrives in F09). */
export function Kukoos({ mood = 'idle', size = 72, beat, children }: KukoosProps) {
  return (
    <div className="flex items-center gap-3">
      <span className={`kukoos kukoos--${mood}`} data-mood={mood} key={`${mood}:${beat ?? ''}`}>
        <KukoosPlaceholder size={size} />
      </span>
      {children && (
        <div className="bubble" data-testid="kukoos-bubble">
          {children}
        </div>
      )}
    </div>
  )
}
