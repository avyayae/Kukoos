import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useCourses } from '@/app/courses'
import { useDailyTime } from '@/app/time'
import {
  type GameRow,
  newId,
  type SavedGame,
  useCurrentProfile,
  useGameWins,
  useRepos,
} from '@/data'
import type { RewardEffect } from '@/domain'
import { type Color, type GameState, newGame, replay } from '@/domain/chess'
import { type BotLevel, isBotLevel } from '@/domain/chess/bot'
import { Button3D, Kukoos } from '@/ui'
import { ChessRest } from '../ChessHome'
import { PLAY_COPY } from '../copy'
import { createBotClient } from './botClient'
import { GameOver } from './GameOver'
import { GameScreen } from './GameScreen'
import { GameSetup } from './GameSetup'

type Stage =
  | { kind: 'loading' }
  | { kind: 'resume'; row: GameRow }
  | { kind: 'setup' }
  | { kind: 'play'; game: GameState; id: string; seed: number; startedAt: number }
  | { kind: 'over'; game: GameState; effects: RewardEffect[]; firstWin: boolean }

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

function fromRow(row: GameRow): GameState | null {
  const level = Number(row.opponent.slice(4))
  if (!isBotLevel(level)) return null
  try {
    return replay({ level, kidColor: row.kidColor, startFen: row.startFen }, row.moves)
  } catch {
    return null
  }
}

const savedGame = (row: GameRow): SavedGame => ({
  id: row.id,
  profileId: row.profileId,
  opponent: row.opponent,
  kidColor: row.kidColor,
  startFen: row.startFen,
  moves: row.moves,
  kidMoves: row.kidMoves,
  result: row.result,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
})

/**
 * /chess/play (spec 017): pick a Kukoos (or come straight from "Your first game" with
 * `?level=1&color=w`), keep playing a saved game, play, and see the end card. Reaching
 * the optional chess limit pauses the game until tomorrow (it's already saved).
 */
export default function PlayRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const repos = useRepos()
  const profile = useCurrentProfile()
  const loadedWins = useGameWins()
  const time = useDailyTime()
  const courses = useCourses()
  const [bot] = useState(() => createBotClient())
  useEffect(() => () => bot.dispose(), [bot])
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  const looked = useRef(false)
  const [extraWins, setExtraWins] = useState<ReadonlySet<BotLevel>>(new Set())
  const wins = new Set([...(loadedWins ?? []), ...extraWins])

  const fixedSeed = params.get('seed')
  const askedLevel = Number(params.get('level'))
  const askedColor = params.get('color')
  const home = () => navigate('/')

  const start = (level: BotLevel, kidColor: Color) =>
    setStage({
      kind: 'play',
      game: newGame(level, kidColor),
      id: newId(),
      seed: fixedSeed !== null ? Number(fixedSeed) : randomSeed(),
      startedAt: Date.now(),
    })

  const fresh = () => {
    if (isBotLevel(askedLevel) && (askedColor === 'w' || askedColor === 'b')) {
      start(askedLevel, askedColor)
    } else setStage({ kind: 'setup' })
  }

  useEffect(() => {
    if (profile === undefined || looked.current) return
    looked.current = true
    const lookup = profile ? repos.games.unfinished(profile.id).catch(() => null) : null
    void Promise.resolve(lookup).then((row) =>
      row && fromRow(row) ? setStage({ kind: 'resume', row }) : fresh(),
    )
  })

  if (time.ready && time.chess.locked && stage.kind !== 'over') {
    return <ChessRest courses={courses} note={PLAY_COPY.savedForTomorrow} />
  }

  switch (stage.kind) {
    case 'loading':
      return null
    case 'resume': {
      const { row } = stage
      return (
        <main className="screen chess-card" data-testid="resume-game">
          <Kukoos mood="happy" size={140} talks>
            <span>{PLAY_COPY.resumeBody}</span>
          </Kukoos>
          <h1 className="chess-card__title">{PLAY_COPY.resumeTitle}</h1>
          <div className="chess-card__actions">
            <Button3D
              variant="primary"
              size="xl"
              block
              data-testid="resume"
              onClick={() => {
                const game = fromRow(row)
                if (!game) return fresh()
                setStage({
                  kind: 'play',
                  game,
                  id: row.id,
                  seed: fixedSeed !== null ? Number(fixedSeed) : randomSeed(),
                  startedAt: row.startedAt,
                })
              }}
            >
              {PLAY_COPY.resume}
            </Button3D>
            <Button3D
              variant="ghost"
              size="lg"
              block
              data-testid="new-game"
              onClick={() => {
                void repos.games.finish(savedGame(row), 'ended').catch(() => [])
                setStage({ kind: 'setup' })
              }}
            >
              {PLAY_COPY.newGame}
            </Button3D>
          </div>
        </main>
      )
    }
    case 'setup':
      return (
        <GameSetup
          wins={wins}
          {...(isBotLevel(askedLevel) ? { initialLevel: askedLevel } : {})}
          onStart={start}
          onBack={home}
        />
      )
    case 'play':
      return (
        <GameScreen
          key={stage.id}
          initial={stage.game}
          gameId={stage.id}
          seed={stage.seed}
          startedAt={stage.startedAt}
          bot={bot}
          onExit={home}
          onFinished={(game, effects) => {
            const firstWin = game.result === 'win' && wins.size === 0
            if (game.result === 'win') setExtraWins(new Set([...extraWins, game.level]))
            setStage({ kind: 'over', game, effects, firstWin })
          }}
        />
      )
    case 'over':
      return (
        <GameOver
          game={stage.game}
          effects={stage.effects}
          firstWin={stage.firstWin}
          onPlay={(level) => start(level, stage.game.kidColor)}
          onHome={home}
        />
      )
  }
}
