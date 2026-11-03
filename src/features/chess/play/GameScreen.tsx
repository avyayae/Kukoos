import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useActivity } from '@/app/time'
import { playSfx } from '@/audio/sfx'
import { cancelSpeech, speak } from '@/audio/tts'
import { type SavedGame, useCurrentProfile, useRepos } from '@/data'
import type { RewardEffect } from '@/domain'
import {
  applyMove,
  type ChessMove,
  type ChessStatus,
  endGame,
  type GameState,
  kidMoves,
  PIECE_NAMES,
  pieceAt,
  pieces,
  type PieceType,
  type Square,
  status,
  takeBack,
  takeBackCount,
  turn,
  whisperFor,
} from '@/domain/chess'
import { BOT_LEVELS } from '@/domain/chess/bot'
import { Button3D, ConfirmSheet, FeedbackBanner, Kukoos, type KukoosMood, useReadAloud } from '@/ui'
import { ChessBoard } from '../board/ChessBoard'
import { PieceArt } from '../board/PieceArt'
import { PLAY_COPY } from '../copy'
import type { BotClient } from './botClient'

interface GameScreenProps {
  initial: GameState
  gameId: string
  /** Kukoos's moves come from this seed (fixed in tests with `?seed=`). */
  seed: number
  startedAt: number
  bot: BotClient
  /** The game ended (mate, draw or "End game"); `effects` are its saved rewards. */
  onFinished: (game: GameState, effects: RewardEffect[]) => void
  /** Back to the castle; the game is already saved. */
  onExit: () => void
}

/** The final position stays on screen this long before the end card. */
const END_PAUSE_MS = 1500
const START_COUNT: Record<Exclude<PieceType, 'k'>, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 }
const ORDER = ['q', 'r', 'b', 'n', 'p'] as const

/** The other side's pieces that are gone from the board: what `by` has captured. */
function captured(game: GameState, by: 'w' | 'b'): PieceType[] {
  const victim = by === 'w' ? 'b' : 'w'
  const left = pieces(game.position).filter((p) => p.color === victim)
  return ORDER.flatMap((type) => {
    const missing = START_COUNT[type] - left.filter((p) => p.type === type).length
    return Array.from({ length: Math.max(0, missing) }, () => type)
  })
}

function botSpeech(move: ChessMove, st: ChessStatus): string {
  const piece = PIECE_NAMES[move.piece]
  const what = move.castle
    ? 'Kukoos castles.'
    : move.capture
      ? `Kukoos takes on ${move.to} with the ${piece}.`
      : `Kukoos moves the ${piece} to ${move.to}.`
  if (st.checkmate) return `${what} Checkmate!`
  if (st.check) return `${what} ${PLAY_COPY.inCheck}`
  return what
}

/** A seed per move: the same game seed always gives the same Kukoos moves. */
const seedFor = (seed: number, ply: number) => (seed + ply * 7919) >>> 0

/**
 * A game against Kukoos (spec 017 AC5): the kid moves, Kukoos thinks in a worker and
 * replies. Unlimited Take back and Hint, the Sleepy Kukoos whisper, End game (never a
 * loss). Saved after every move; the result is saved once, with its rewards.
 */
export function GameScreen({
  initial,
  gameId,
  seed,
  startedAt,
  bot,
  onFinished,
  onExit,
}: GameScreenProps) {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const { readAloud, setReadAloud } = useReadAloud()
  const [game, setGame] = useState(initial)
  const [whisper, setWhisper] = useState<{ square: Square; text: string } | null>(null)
  const [hint, setHint] = useState<{ ply: number; squares: Square[] } | null>(null)
  const [announce, setAnnounce] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const finished = useRef(false)
  const def = BOT_LEVELS[game.level]

  const kidsTurn = !game.result && turn(game.position) === game.kidColor
  const thinking = !game.result && !kidsTurn && !whisper
  // Kukoos's thinking time isn't the kid's play time (spec 017 AC9).
  useActivity(thinking || game.result ? null : 'chess')

  const row = (g: GameState): SavedGame | null =>
    profile
      ? {
          id: gameId,
          profileId: profile.id,
          opponent: `bot:${g.level}`,
          kidColor: g.kidColor,
          startFen: g.startFen,
          moves: [...g.moves],
          kidMoves: kidMoves(g),
          result: null,
          startedAt,
          endedAt: null,
        }
      : null

  // Save after every move; the result once, then the end card.
  const persist = useEffectEvent((g: GameState) => {
    const saved = row(g)
    if (!g.result) {
      if (saved && g.moves.length > 0) void repos.games.save(saved).catch(() => undefined)
      return
    }
    if (finished.current) return
    finished.current = true
    const result = g.result
    const effects = saved ? repos.games.finish(saved, result).catch(() => []) : Promise.resolve([])
    const pause = result === 'ended' ? 0 : END_PAUSE_MS
    void Promise.all([effects, new Promise((r) => window.setTimeout(r, pause))]).then(([e]) =>
      onFinished(g, e),
    )
  })
  useEffect(() => persist(game), [game])

  // Kukoos's turn: ask the worker; a take back or leaving drops a late answer.
  const reply = useEffectEvent((move: ChessMove, next: GameState) => {
    const st = status(next.position)
    playSfx(st.check ? 'check' : move.capture ? 'capture' : 'move')
    const line = botSpeech(move, st)
    setAnnounce(line)
    if (readAloud) speak(line)
  })
  useEffect(() => {
    if (!thinking) return
    let alive = true
    void bot
      .ask({
        fen: game.position.fen,
        seen: game.position.seen,
        level: game.level,
        seed: seedFor(seed, game.moves.length),
        kind: 'move',
      })
      .then((input) => {
        if (!alive || !input) return
        const next = applyMove(game, input)
        if (!next) return
        setGame(next.game)
        reply(next.move, next.game)
      })
    return () => {
      alive = false
    }
  }, [thinking, game, bot, seed])

  useEffect(() => cancelSpeech, [])

  const say = (text: string) => {
    setAnnounce(text)
    if (readAloud) speak(text)
  }

  const onKidMove = (move: ChessMove) => {
    const next = applyMove(game, {
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    })
    if (!next) return
    setGame(next.game)
    setHint(null)
    // Sleepy Kukoos whispers once when a piece is left free to take (spec 017).
    if (game.level === 1 && !next.game.result) {
      const sq = whisperFor(game.position, next.game.position, next.move)
      const piece = sq ? pieceAt(next.game.position, sq) : null
      if (sq && piece) {
        const text = `Psst… your ${PIECE_NAMES[piece.type]} can be taken!`
        setWhisper({ square: sq, text })
        say(text)
      }
    }
  }

  const doTakeBack = () => {
    if (takeBackCount(game) === 0) return
    setWhisper(null)
    setHint(null)
    setGame(takeBack(game))
    say('Taken back. Your turn!')
  }

  const askHint = () => {
    if (!kidsTurn || whisper) return
    const ply = game.moves.length
    void bot
      .ask({
        fen: game.position.fen,
        seen: game.position.seen,
        level: 4,
        seed: 0,
        kind: 'hint',
      })
      .then((m) => {
        if (!m) return
        setHint((h) => (h && h.ply !== ply ? h : { ply, squares: [m.from, m.to] }))
        const piece = pieceAt(game.position, m.from)
        say(`Try the ${PIECE_NAMES[piece?.type ?? 'p']} to ${m.to}.`)
      })
  }

  const inCheck = kidsTurn && status(game.position).check
  const line = game.result
    ? ''
    : whisper
      ? whisper.text
      : thinking
        ? PLAY_COPY.thinking
        : inCheck
          ? PLAY_COPY.inCheck
          : PLAY_COPY.yourTurn
  const mood: KukoosMood = thinking ? 'think' : whisper || inCheck ? 'encourage' : 'idle'
  const shownHint = hint?.ply === game.moves.length ? hint.squares : []
  const kukoosTook = captured(game, game.kidColor === 'w' ? 'b' : 'w')
  const kidTook = captured(game, game.kidColor)

  return (
    <main className="screen game" data-testid="game" data-thinking={thinking || undefined}>
      <header className="game__top">
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Back to Chess Castle"
          onClick={onExit}
        >
          ←
        </button>
        <h1 className="game__title">
          <span aria-hidden="true">{def.emoji}</span> {def.name}
        </h1>
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label={readAloud ? 'Turn off reading aloud' : 'Turn on reading aloud'}
          aria-pressed={readAloud}
          onClick={() => {
            if (readAloud) cancelSpeech()
            setReadAloud(!readAloud)
          }}
        >
          {readAloud ? '🔊' : '🔇'}
        </button>
      </header>

      <div className="game__kukoos">
        <Kukoos mood={mood} size={56} beat={`${game.moves.length}:${mood}`} talks>
          <span data-testid="game-turn">{line}</span>
        </Kukoos>
      </div>

      <Captured label="Kukoos took" types={kukoosTook} color={game.kidColor} />
      <div className="game__board">
        <ChessBoard
          position={game.position}
          lastMove={game.lastMove}
          movable={kidsTurn && !whisper ? game.kidColor : 'none'}
          flipped={game.kidColor === 'b'}
          label={`Chess game against ${def.name}`}
          marks={{ hint: shownHint, warn: whisper ? [whisper.square] : [] }}
          onMove={({ move }) => onKidMove(move)}
        />
      </div>
      <Captured label="You took" types={kidTook} color={game.kidColor === 'w' ? 'b' : 'w'} />

      <div className="game__actions">
        <Button3D
          variant="secondary"
          size="lg"
          disabled={takeBackCount(game) === 0}
          onClick={doTakeBack}
        >
          ↶ {PLAY_COPY.takeBack}
        </Button3D>
        <Button3D variant="secondary" size="lg" disabled={!kidsTurn || !!whisper} onClick={askHint}>
          💡 {PLAY_COPY.hint}
        </Button3D>
        <Button3D
          variant="ghost"
          size="lg"
          disabled={!!game.result}
          onClick={() => setConfirmEnd(true)}
        >
          {PLAY_COPY.endGame}
        </Button3D>
      </div>

      <p role="status" aria-live="polite" className="sr-only" data-testid="game-announce">
        {announce}
      </p>

      {whisper && (
        <FeedbackBanner
          variant="notYet"
          title="Psst…"
          body={whisper.text.replace('Psst… ', '')}
          actionLabel={PLAY_COPY.whisperTakeBack}
          onAction={doTakeBack}
          secondary={{ label: PLAY_COPY.whisperPlayOn, onClick: () => setWhisper(null) }}
        />
      )}

      <ConfirmSheet
        open={confirmEnd}
        title={PLAY_COPY.confirmEnd}
        confirmLabel={PLAY_COPY.stop}
        cancelLabel={PLAY_COPY.keepPlaying}
        onConfirm={() => {
          setConfirmEnd(false)
          setWhisper(null)
          setGame(endGame(game))
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </main>
  )
}

function Captured({
  label,
  types,
  color,
}: {
  label: string
  types: PieceType[]
  color: 'w' | 'b'
}) {
  return (
    <p className="game__captured">
      <span className="sr-only">
        {label}: {types.length === 0 ? 'nothing yet' : types.map((x) => PIECE_NAMES[x]).join(', ')}
      </span>
      {types.map((type, i) => (
        <span key={`${type}${i}`} className="game__captured-piece" aria-hidden="true">
          <PieceArt type={type} color={color} />
        </span>
      ))}
    </p>
  )
}
