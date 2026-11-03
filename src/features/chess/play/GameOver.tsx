import { useEffect, useState } from 'react'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import type { RewardEffect } from '@/domain'
import type { GameState } from '@/domain/chess'
import { BOT_LEVELS, type BotLevel } from '@/domain/chess/bot'
import { momentFor } from '@/features/rewards/copy'
import { CountUp } from '@/features/rewards/CountUp'
import { RewardMoment } from '@/features/rewards/RewardMoment'
import { Button3D, Kukoos, type KukoosMood, useReadAloud } from '@/ui'
import { DRAW_LINES, PLAY_COPY } from '../copy'

interface GameOverProps {
  game: GameState
  effects: readonly RewardEffect[]
  /** This was the kid's first win against any Kukoos ("Your first game", spec 017 AC8). */
  firstWin: boolean
  onPlay: (level: BotLevel) => void
  onHome: () => void
}

interface Ending {
  title: string
  body: string
  mood: KukoosMood
  /** The one primary action, then the quieter ones. */
  actions: { label: string; level?: BotLevel; testId: string }[]
}

function endingFor(game: GameState, firstWin: boolean): Ending {
  const def = BOT_LEVELS[game.level]
  const result = game.result ?? 'ended'
  const again = { label: PLAY_COPY.playAgain, level: game.level, testId: 'play-again' }
  if (result === 'win') {
    const next = game.level < 4 ? BOT_LEVELS[(game.level + 1) as BotLevel] : null
    return {
      title: PLAY_COPY.wonTitle,
      body: firstWin
        ? PLAY_COPY.firstWin
        : next
          ? `You beat ${def.name}! Want to try ${next.name}?`
          : `You beat ${def.name}!`,
      mood: 'cheer',
      actions: next
        ? [
            { label: `Play ${next.name}`, level: next.level, testId: 'play-next-level' },
            { label: PLAY_COPY.rematch, level: game.level, testId: 'rematch' },
          ]
        : [again],
    }
  }
  if (result === 'loss') {
    const easier = game.level > 1 ? BOT_LEVELS[(game.level - 1) as BotLevel] : null
    return {
      title: PLAY_COPY.lostTitle,
      body: `${def.name} won this time. Every game makes you stronger!`,
      mood: 'encourage',
      actions: [
        { label: PLAY_COPY.rematch, level: game.level, testId: 'rematch' },
        ...(easier ? [{ label: PLAY_COPY.easier, level: easier.level, testId: 'easier' }] : []),
      ],
    }
  }
  if (result === 'ended') {
    return {
      title: PLAY_COPY.endedTitle,
      body: PLAY_COPY.endedBody,
      mood: 'happy',
      actions: [again],
    }
  }
  const reason = result.slice('draw:'.length)
  return {
    title: PLAY_COPY.drawTitle,
    body: DRAW_LINES[reason] ?? '',
    mood: 'happy',
    actions: [again],
  }
}

/**
 * The end of a game (spec 017 AC6): a win is celebrated, a loss is "Good game!" (no sad
 * sound, never "game over"), a draw is explained. Bigger reward moments (a level up) play
 * one at a time before the chosen action.
 */
export function GameOver({ game, effects, firstWin, onPlay, onHome }: GameOverProps) {
  const { readAloud } = useReadAloud()
  const ending = endingFor(game, firstWin)
  const moments = effects.flatMap((effect) => {
    const copy = momentFor(effect)
    return copy ? [{ effect, copy }] : []
  })
  const [after, setAfter] = useState<(() => void) | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (game.result === 'win') playSfx('complete')
    if (readAloud) speak(`${ending.title.replace(' 🎉', '')} ${ending.body}`)
  }, [game.result, readAloud, ending.title, ending.body])

  const then = (action: () => void) => {
    if (moments.length === 0) return action()
    setAfter(() => action)
    setStep(1)
  }
  const current = step > 0 ? moments[step - 1] : undefined
  if (current && after) {
    return (
      <RewardMoment
        key={step}
        step={step}
        effect={current.effect}
        copy={current.copy}
        autoRead={readAloud}
        onContinue={() => (step < moments.length ? setStep(step + 1) : after())}
      />
    )
  }

  const xp = effects.find((e) => e.type === 'xpGained')
  const gems = effects.find((e) => e.type === 'gemsGained')
  return (
    <main className="screen chess-card game-over" data-testid="game-over" data-result={game.result}>
      <Kukoos mood={ending.mood} size={140} talks>
        <span>{ending.body}</span>
      </Kukoos>
      <h1 className="chess-card__title">{ending.title}</h1>
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
      <div className="chess-card__actions">
        {ending.actions.map((a, i) => (
          <Button3D
            key={a.testId}
            variant={i === 0 ? 'primary' : 'secondary'}
            size={i === 0 ? 'xl' : 'lg'}
            block
            data-testid={a.testId}
            onClick={() => then(() => onPlay(a.level ?? game.level))}
          >
            {a.label}
          </Button3D>
        ))}
        <Button3D
          variant="ghost"
          size="lg"
          block
          data-testid="back-to-castle"
          onClick={() => then(onHome)}
        >
          {PLAY_COPY.backToCastle}
        </Button3D>
      </div>
    </main>
  )
}
