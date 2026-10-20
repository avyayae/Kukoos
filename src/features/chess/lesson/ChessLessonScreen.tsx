import { useEffect, useEffectEvent, useReducer, useState } from 'react'
import { useActivity } from '@/app/time'
import { playSfx } from '@/audio/sfx'
import { cancelSpeech, speak } from '@/audio/tts'
import { newId, useCurrentProfile, useRepos } from '@/data'
import type { RewardEffect, SkillId, SkillMastery } from '@/domain'
import { PIECE_NAMES, pieceAt, type Square, turn } from '@/domain/chess'
import {
  type ChessLessonState,
  chessLessonProgress,
  chessLessonReducer,
  startChessLesson,
} from '@/domain/chess/lesson'
import { nextAnswer } from '@/domain/chess/puzzles/solve'
import { answerMode } from '@/domain/chess/puzzles/run'
import { LessonComplete } from '@/features/lesson-player/LessonComplete'
import { t } from '@/features/lesson-player/copy'
import { sfxFor } from '@/features/lesson-player/sounds'
import {
  ConfirmSheet,
  FeedbackBanner,
  Kukoos,
  type KukoosMood,
  ProgressBar,
  SpeakButton,
  useReadAloud,
} from '@/ui'
import { ChessBoard } from '../board/ChessBoard'
import { CHESS_COPY, praise } from '../copy'

interface ChessLessonScreenProps {
  skillId: SkillId
  seed: number
  progress: Partial<Record<SkillId, SkillMastery>>
  mode?: 'skill' | 'review'
  /** "Already know this?" (spec 016 AC6): not saved; reports the finished check instead. */
  skipCheck?: boolean
  onDone?: (state: ChessLessonState) => void
  onExit: () => void
  now?: () => number
}

/** What the right answer is, in words (after two misses). */
function solutionText(state: ChessLessonState): string {
  const a = nextAnswer(state.run)
  if (!a) return ''
  if (a.mode === 'tap') return `It’s ${a.square}.`
  if (a.mode === 'choice') return `The answer is ${a.value}.`
  const piece = pieceAt(state.run.position, a.move.from)
  return `The ${PIECE_NAMES[piece?.type ?? 'p']} goes to ${a.move.to}.`
}

function hintSquares(state: ChessLessonState): Square[] {
  const a = nextAnswer(state.run)
  if (!a) return []
  if (a.mode === 'tap') return [a.square]
  if (a.mode === 'move') return [a.move.from, a.move.to]
  return []
}

/**
 * A chess lesson (spec 016 AC4): 8 puzzles on the board. The move (or tap, or tile) is the
 * answer. Gentle hints, a retry, the answer shown after two misses, then the shared
 * celebration. Chess is open play: its time is only recorded (spec 013).
 */
export function ChessLessonScreen({
  skillId,
  seed,
  progress,
  mode = 'skill',
  skipCheck = false,
  onDone,
  onExit,
  now = Date.now,
}: ChessLessonScreenProps) {
  useActivity('chess')
  const [state, dispatch] = useReducer(chessLessonReducer, undefined, () =>
    startChessLesson({ skillId, seed, at: now(), progress, mode, skipCheck }),
  )
  const { readAloud: autoRead, setReadAloud: setAutoRead } = useReadAloud()
  const [confirmExit, setConfirmExit] = useState(false)
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [lessonId] = useState(newId)
  const [effects, setEffects] = useState<RewardEffect[] | null>(null)

  const save = (s: ChessLessonState): Promise<RewardEffect[]> =>
    !profile || skipCheck
      ? Promise.resolve([])
      : repos.lessons.save(s, { lessonId, profileId: profile.id }).catch(() => [])
  const onComplete = useEffectEvent(() => {
    if (profile === undefined) return
    if (skipCheck) {
      onDone?.(state)
      return
    }
    void save(state).then(setEffects)
  })
  useEffect(() => {
    if (state.phase === 'complete') onComplete()
  }, [state.phase, profile])

  const { phase, puzzle, run } = state
  const key = `${state.index}:${puzzle.id}`

  // --- speech and sound, like the math lesson
  useEffect(() => {
    if (autoRead && phase === 'answering') speak(puzzle.prompt.speech)
  }, [key, autoRead, phase, puzzle.prompt.speech])
  const banner =
    phase === 'correct'
      ? { variant: 'correct' as const, title: praise(state.seed + state.index) }
      : phase === 'notYet'
        ? { variant: 'notYet' as const, title: CHESS_COPY.notYet, body: state.hint ?? '' }
        : phase === 'solution'
          ? {
              variant: 'solution' as const,
              title: CHESS_COPY.solutionTitle,
              body: solutionText(state),
            }
          : null
  const announcement = banner ? [banner.title, banner.body].filter(Boolean).join(' ') : ''
  useEffect(() => {
    if (autoRead && announcement) speak(announcement)
  }, [announcement, autoRead])
  useEffect(() => cancelSpeech, [])
  const playFeedback = useEffectEvent(() => {
    const sfx = sfxFor(phase, state.combo)
    if (sfx) playSfx(sfx)
  })
  useEffect(() => playFeedback(), [key, phase])

  if (phase === 'complete') {
    if (skipCheck) return null
    return (
      <LessonComplete state={state} effects={effects} autoRead={autoRead} onContinue={onExit} />
    )
  }

  const answering = phase === 'answering'
  const mode_ = answerMode(puzzle)
  const mood: KukoosMood =
    phase === 'correct'
      ? state.combo >= 3
        ? 'cheer'
        : 'happy'
      : phase === 'notYet'
        ? 'encourage'
        : phase === 'solution'
          ? 'think'
          : 'idle'
  const marks = {
    stars: run.starsLeft,
    target: puzzle.marks.target ?? null,
    hint: phase === 'solution' ? hintSquares(state) : [],
  }

  return (
    <main className="lesson screen chess-lesson" data-phase={phase} data-testid="chess-lesson">
      <header className="lesson__top">
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Leave lesson"
          onClick={() => setConfirmExit(true)}
        >
          ✕
        </button>
        <ProgressBar value={chessLessonProgress(state)} hot={state.combo >= 3} />
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label={autoRead ? 'Turn off reading aloud' : 'Turn on reading aloud'}
          aria-pressed={autoRead}
          onClick={() => {
            if (autoRead) cancelSpeech()
            setAutoRead(!autoRead)
          }}
        >
          {autoRead ? '🔊' : '🔇'}
        </button>
      </header>

      <div className="lesson__kukoos">
        <Kukoos mood={mood} size={56} beat={`${key}:${phase}`} talks>
          <span data-testid="bubble-text">{puzzle.prompt.text}</span>
        </Kukoos>
        <SpeakButton text={puzzle.prompt.speech} />
      </div>

      {puzzle.maxMoves !== undefined && (
        <p className="chess-lesson__moves" data-testid="moves-left">
          Moves: {run.moves} of {puzzle.maxMoves}
        </p>
      )}

      <div className="chess-lesson__board">
        <ChessBoard
          position={run.position}
          lastMove={run.lastMove}
          movable={answering && mode_ === 'move' ? turn(run.position) : 'none'}
          onlyFrom={run.focus}
          // "Check or not?" puzzles: the glow would give the answer away.
          showCheck={puzzle.kind !== 'which'}
          marks={marks}
          label={puzzle.prompt.text}
          {...(answering && mode_ === 'tap'
            ? { onTap: (square: Square) => dispatch({ type: 'tap', square, at: now() }) }
            : {})}
          onMove={({ move }) =>
            dispatch({
              type: 'move',
              input: {
                from: move.from,
                to: move.to,
                ...(move.promotion ? { promotion: move.promotion } : {}),
              },
              at: now(),
            })
          }
          onIllegal={(reason, from) => dispatch({ type: 'illegal', reason, from, at: now() })}
        />
      </div>

      {mode_ === 'choice' && (
        <div className="tiles chess-lesson__choices" role="group" aria-label="Answers">
          {(puzzle.choices ?? []).map((c) => (
            <button
              key={c}
              type="button"
              className={`tile${phase === 'solution' && c === puzzle.answer ? ' tile--correct' : ''}`}
              disabled={!answering}
              onClick={() => dispatch({ type: 'choice', value: c, at: now() })}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {banner && (
        <FeedbackBanner
          variant={banner.variant}
          title={banner.title}
          {...(banner.body ? { body: banner.body } : {})}
          actionLabel={phase === 'notYet' ? 'Try again' : 'Continue'}
          onAction={() =>
            phase === 'notYet'
              ? dispatch({ type: 'retry' })
              : dispatch({ type: 'continue', at: now() })
          }
        />
      )}

      <ConfirmSheet
        open={confirmExit}
        title={t('lesson:leaveTitle')}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          if (!skipCheck) void save(state)
          onExit()
        }}
        onCancel={() => setConfirmExit(false)}
      />
    </main>
  )
}
