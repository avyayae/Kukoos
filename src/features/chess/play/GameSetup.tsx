import { useState } from 'react'
import type { Color } from '@/domain/chess'
import { BOT_LEVELS, type BotLevel, LEVELS } from '@/domain/chess/bot'
import { Button3D, useSpeakOnTap } from '@/ui'
import { PieceArt } from '../board/PieceArt'
import { PLAY_COPY } from '../copy'

type ColorChoice = Color | 'surprise'

interface GameSetupProps {
  /** Levels this kid has beaten (a crown on the card). */
  wins: ReadonlySet<BotLevel>
  initialLevel?: BotLevel
  onStart: (level: BotLevel, color: Color) => void
  onBack: () => void
}

/**
 * "Who do you want to play?" (spec 017): four Kukoos cards, all open from the start, and
 * the kid's colour. One primary action: Play!
 */
export function GameSetup({ wins, initialLevel = 1, onStart, onBack }: GameSetupProps) {
  const say = useSpeakOnTap()
  const [level, setLevel] = useState<BotLevel>(initialLevel)
  const [color, setColor] = useState<ColorChoice>('w')
  const colors: { id: ColorChoice; label: string; note?: string }[] = [
    { id: 'w', label: PLAY_COPY.white, note: PLAY_COPY.whiteNote },
    { id: 'b', label: PLAY_COPY.black },
    { id: 'surprise', label: PLAY_COPY.surprise },
  ]

  return (
    <main className="screen game-setup" data-testid="game-setup">
      <header className="game__top">
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Back to Chess Castle"
          onClick={onBack}
        >
          ←
        </button>
        <h1 className="game__title">{PLAY_COPY.setupTitle}</h1>
      </header>

      <div className="level-cards" role="radiogroup" aria-label={PLAY_COPY.setupTitle}>
        {LEVELS.map((l) => {
          const def = BOT_LEVELS[l]
          const won = wins.has(l)
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              className={`tile level-card${level === l ? ' tile--selected' : ''}`}
              data-testid={`level-${l}`}
              onClick={() => {
                setLevel(l)
                say(`${def.name}. ${def.description}`)
              }}
            >
              <span className="level-card__face" aria-hidden="true">
                {def.emoji}
              </span>
              <span className="level-card__text">
                <span className="level-card__name">
                  {def.name}
                  {won && <span aria-label=", beaten"> 👑</span>}
                </span>
                <span className="level-card__about">{def.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      <fieldset className="color-pick">
        <legend className="color-pick__title">{PLAY_COPY.colorTitle}</legend>
        {colors.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`tile color-pick__choice${color === c.id ? ' tile--selected' : ''}`}
            aria-pressed={color === c.id}
            data-testid={`color-${c.id}`}
            onClick={() => {
              setColor(c.id)
              say(c.note ? `${c.label}, ${c.note}` : c.label)
            }}
          >
            <span className="color-pick__piece" aria-hidden="true">
              {c.id === 'surprise' ? '🎲' : <PieceArt type="k" color={c.id} />}
            </span>
            {c.label}
          </button>
        ))}
      </fieldset>

      <div className="game-setup__dock">
        <Button3D
          variant="primary"
          size="xl"
          block
          data-testid="start-game"
          onClick={() =>
            onStart(level, color === 'surprise' ? (Math.random() < 0.5 ? 'w' : 'b') : color)
          }
        >
          {PLAY_COPY.start}
        </Button3D>
      </div>
    </main>
  )
}
