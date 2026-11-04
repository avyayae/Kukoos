import { useEffect, useEffectEvent, useReducer, useState } from 'react'
import { useActivity } from '@/app/time'
import { playSfx } from '@/audio/sfx'
import { cancelSpeech, isSpeechSupported, speak, speakParts } from '@/audio/tts'
import { newId, useCurrentProfile, useRepos } from '@/data'
import type { RewardEffect, SkillId, SkillMastery } from '@/domain'
import {
  solutionText,
  spanishLessonProgress,
  spanishLessonReducer,
  type SpanishLessonState,
  startSpanishLesson,
} from '@/domain/spanish/lesson'
import type { SpanishQuestion } from '@/domain/spanish/questions'
import { type SpanishWord, shown } from '@/domain/spanish/words'
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
import { praise, SPANISH_COPY } from '../copy'
import { WordPicture } from './WordPicture'

interface SpanishLessonScreenProps {
  skillId: SkillId
  seed: number
  progress: Partial<Record<SkillId, SkillMastery>>
  mode?: 'skill' | 'review'
  /** "Already know these words?" (spec 019 AC7): not saved; reports the finished check. */
  skipCheck?: boolean
  /** ¡Fiesta! (spec 020): 8 questions from across the island. */
  fiesta?: boolean
  onDone?: (state: SpanishLessonState) => void
  onExit: () => void
  /** After the celebration of a finished lesson (defaults to `onExit`). */
  onFinished?: () => void
  now?: () => number
}

const sayEs = (text: string) => speak(text, { lang: 'es' })

/**
 * A Spanish lesson (spec 019 AC4): 8 scored questions with pictures, plus one "say it" step.
 * Every Spanish word is heard in a Spanish voice; instructions stay in English (AC5).
 * Spanish is open play: its time is only recorded (spec 018).
 */
export function SpanishLessonScreen({
  skillId,
  seed,
  progress,
  mode = 'skill',
  skipCheck = false,
  fiesta = false,
  onDone,
  onExit,
  onFinished = onExit,
  now = Date.now,
}: SpanishLessonScreenProps) {
  useActivity('spanish')
  const [canHear] = useState(isSpeechSupported)
  const [state, dispatch] = useReducer(spanishLessonReducer, undefined, () =>
    startSpanishLesson({ skillId, seed, at: now(), progress, mode, skipCheck, canHear, fiesta }),
  )
  const { readAloud: autoRead, setReadAloud: setAutoRead } = useReadAloud()
  const [confirmExit, setConfirmExit] = useState(false)
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [lessonId] = useState(newId)
  const [effects, setEffects] = useState<RewardEffect[] | null>(null)
  /** The tile or word picked first (see: tap to hear; match: the word to join). */
  const [selected, setSelected] = useState<string | null>(null)
  const [lastPick, setLastPick] = useState<string | null>(null)

  const save = (s: SpanishLessonState): Promise<RewardEffect[]> =>
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

  const { phase, question: q } = state
  const key = `${state.index}:${q.id}`
  const hearsWord = canHear && (q.kind === 'listen' || q.kind === 'count' || q.kind === 'say')

  // --- speech: the word always plays (it *is* the question); English only with read-aloud
  const askAloud = useEffectEvent((first: boolean) => {
    const intro = autoRead && first ? [q.prompt.speech] : []
    if (hearsWord) speakParts([...intro, { es: q.word }])
    else if (intro.length > 0) speak(q.prompt.speech)
  })
  useEffect(() => {
    if (phase === 'answering') askAloud(state.attempts === 0)
  }, [key, phase, state.attempts])

  const correctTitle = q.kind === 'say' ? SPANISH_COPY.sayPraise : praise(state.seed + state.index)
  const banner =
    phase === 'correct'
      ? {
          variant: 'correct' as const,
          title: correctTitle,
          body: q.kind === 'say' || q.kind === 'match' ? '' : `${shown(q.answer)}: ${q.answer.en}`,
        }
      : phase === 'notYet'
        ? { variant: 'notYet' as const, title: SPANISH_COPY.notYet, body: state.hint ?? '' }
        : phase === 'solution'
          ? {
              variant: 'solution' as const,
              title: SPANISH_COPY.solutionTitle,
              body: solutionText(state),
            }
          : null
  const announcement = banner ? [banner.title, banner.body].filter(Boolean).join(' ') : ''
  const sayFeedback = useEffectEvent(() => {
    if (phase === 'correct') {
      // "¡Muy bien! El perro." in Spanish: the word heard once more (AC4).
      const word = q.kind === 'say' || q.kind === 'match' ? '' : ` ${shown(q.answer)}.`
      if (q.kind === 'say') {
        if (autoRead) speak(SPANISH_COPY.sayPraise)
      } else if (canHear) sayEs(`${correctTitle}${word}`)
      return
    }
    if (phase === 'notYet' && autoRead && state.hint) speak(state.hint)
    if (phase === 'solution' && q.kind !== 'match') {
      speakParts([...(autoRead ? [SPANISH_COPY.solutionTitle] : []), { es: shown(q.answer) }])
    }
  })
  useEffect(() => {
    if (announcement) sayFeedback()
  }, [announcement])
  useEffect(() => cancelSpeech, [])
  const playFeedback = useEffectEvent(() => {
    const sfx = sfxFor(phase, state.combo)
    if (sfx) playSfx(sfx)
  })
  useEffect(() => playFeedback(), [key, phase])
  // A fresh question starts with nothing picked.
  const [seenKey, setSeenKey] = useState(key)
  if (seenKey !== key) {
    setSeenKey(key)
    setSelected(null)
    setLastPick(null)
  }

  if (phase === 'complete') {
    if (skipCheck) return null
    return (
      <LessonComplete state={state} effects={effects} autoRead={autoRead} onContinue={onFinished} />
    )
  }

  const answering = phase === 'answering'
  const choose = (w: SpanishWord) => {
    setLastPick(w.id)
    dispatch({ type: 'choice', wordId: w.id, at: now() })
  }
  const mood: KukoosMood =
    phase === 'correct'
      ? state.combo >= 3 || q.kind === 'say'
        ? 'cheer'
        : 'happy'
      : phase === 'notYet'
        ? 'encourage'
        : phase === 'solution'
          ? 'think'
          : 'idle'

  return (
    <main
      className="lesson screen spanish-lesson"
      data-phase={phase}
      data-kind={q.kind}
      data-testid="spanish-lesson"
    >
      <header className="lesson__top">
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Leave lesson"
          onClick={() => setConfirmExit(true)}
        >
          ✕
        </button>
        <ProgressBar value={spanishLessonProgress(state)} hot={state.combo >= 3} />
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
          <span data-testid="bubble-text">{q.prompt.text}</span>
        </Kukoos>
        <SpeakButton text={q.prompt.speech} />
      </div>

      {hearsWord && q.kind !== 'say' && (
        <button
          type="button"
          className="btn3d btn3d--sky btn3d--xl spanish-lesson__hear"
          aria-label={SPANISH_COPY.hearIt}
          data-testid="hear-word"
          onClick={() => sayEs(q.word)}
        >
          🔊 <span>{SPANISH_COPY.hearIt}</span>
        </button>
      )}

      {(q.kind === 'listen' || q.kind === 'count') && (
        <PictureChoices
          question={q}
          answering={answering}
          phase={phase}
          lastPick={lastPick}
          onChoose={choose}
        />
      )}
      {q.kind === 'see' && (
        <SeeChoices
          question={q}
          answering={answering}
          phase={phase}
          lastPick={lastPick}
          selected={selected}
          twoTaps={canHear}
          onSelect={(w) => {
            setSelected(w.id)
            sayEs(shown(w))
          }}
          onChoose={choose}
        />
      )}
      {q.kind === 'match' && (
        <MatchBoard
          question={q}
          answering={answering}
          solution={phase === 'solution'}
          matched={state.matched}
          selected={selected}
          lastPick={phase === 'notYet' ? lastPick : null}
          onWord={(w) => {
            setSelected(w.id)
            if (canHear) sayEs(shown(w))
          }}
          onPicture={(w) => {
            if (!selected) return
            setLastPick(w.id)
            setSelected(null)
            dispatch({ type: 'pair', wordId: selected, pictureId: w.id, at: now() })
          }}
        />
      )}
      {q.kind === 'say' && (
        <section className="spanish-say" aria-label={SPANISH_COPY.saidIt}>
          <div className="spanish-say__card">
            <WordPicture picture={q.answer.picture} />
            <span className="spanish-say__word" lang="es">
              {shown(q.answer)}
            </span>
          </div>
          <button
            type="button"
            className="btn3d btn3d--sky btn3d--lg"
            data-testid="hear-word"
            onClick={() => sayEs(q.word)}
          >
            🔊 {SPANISH_COPY.hearAgain}
          </button>
          {answering && (
            <button
              type="button"
              className="btn3d btn3d--primary btn3d--xl btn3d--block"
              data-testid="said-it"
              onClick={() => dispatch({ type: 'said' })}
            >
              {SPANISH_COPY.saidIt}
            </button>
          )}
        </section>
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
          onAction={() => {
            setSelected(null)
            if (phase === 'notYet') dispatch({ type: 'retry' })
            else dispatch({ type: 'continue', at: now() })
          }}
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

function tileState(
  w: SpanishWord,
  q: SpanishQuestion,
  phase: SpanishLessonState['phase'],
  lastPick: string | null,
  selected: string | null = null,
): string {
  if ((phase === 'correct' || phase === 'solution') && w.id === q.answer.id) return ' tile--correct'
  if (phase === 'notYet' && w.id === lastPick) return ' tile--incorrect'
  if (w.id === selected) return ' tile--selected'
  return ''
}

function PictureChoices({
  question: q,
  answering,
  phase,
  lastPick,
  onChoose,
}: {
  question: SpanishQuestion
  answering: boolean
  phase: SpanishLessonState['phase']
  lastPick: string | null
  onChoose: (w: SpanishWord) => void
}) {
  const dots = q.kind === 'count'
  return (
    <div
      className={`tiles spanish-choices${q.choices.length === 3 ? ' tiles--3' : ' tiles--4'}`}
      role="group"
      aria-label="Pictures"
    >
      {q.choices.map((w) => (
        <button
          key={w.id}
          type="button"
          className={`tile spanish-choice${tileState(w, q, phase, lastPick)}`}
          aria-label={dots && 'number' in w.picture ? `${w.picture.number} dots` : w.en}
          data-testid={`choice-${w.id}`}
          disabled={!answering}
          onClick={() => onChoose(w)}
        >
          <WordPicture picture={w.picture} dots={dots} />
        </button>
      ))}
    </div>
  )
}

function SeeChoices({
  question: q,
  answering,
  phase,
  lastPick,
  selected,
  twoTaps,
  onSelect,
  onChoose,
}: {
  question: SpanishQuestion
  answering: boolean
  phase: SpanishLessonState['phase']
  lastPick: string | null
  selected: string | null
  /** Tap once to hear, tap again to choose (one tap without speech). */
  twoTaps: boolean
  onSelect: (w: SpanishWord) => void
  onChoose: (w: SpanishWord) => void
}) {
  return (
    <>
      <div className="spanish-see__picture" data-testid="see-picture">
        <WordPicture picture={q.answer.picture} />
      </div>
      <div className="tiles tiles--3 spanish-words" role="group" aria-label="Words">
        {q.choices.map((w) => (
          <button
            key={w.id}
            type="button"
            lang="es"
            className={`tile spanish-word${tileState(w, q, phase, lastPick, selected)}`}
            aria-pressed={w.id === selected}
            data-testid={`choice-${w.id}`}
            disabled={!answering}
            onClick={() => (!twoTaps || w.id === selected ? onChoose(w) : onSelect(w))}
          >
            {shown(w)}
          </button>
        ))}
      </div>
    </>
  )
}

function MatchBoard({
  question: q,
  answering,
  solution,
  matched,
  selected,
  lastPick,
  onWord,
  onPicture,
}: {
  question: SpanishQuestion
  answering: boolean
  solution: boolean
  matched: readonly string[]
  selected: string | null
  lastPick: string | null
  onWord: (w: SpanishWord) => void
  onPicture: (w: SpanishWord) => void
}) {
  // Pictures in their own order; after two misses they line up with their words.
  const pictures = solution ? q.choices : [...q.choices].sort((a, b) => a.id.localeCompare(b.id))
  const done = (w: SpanishWord) => solution || matched.includes(w.id)
  return (
    <div className="spanish-match" data-testid="match-board">
      <div className="spanish-match__col" role="group" aria-label="Words">
        {q.choices.map((w) => (
          <button
            key={w.id}
            type="button"
            lang="es"
            className={`tile spanish-word${done(w) ? ' tile--correct' : w.id === selected ? ' tile--selected' : ''}`}
            aria-pressed={w.id === selected}
            data-testid={`word-${w.id}`}
            disabled={!answering || done(w)}
            onClick={() => onWord(w)}
          >
            {shown(w)}
          </button>
        ))}
      </div>
      <div className="spanish-match__col" role="group" aria-label="Pictures">
        {pictures.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`tile spanish-choice${done(w) ? ' tile--correct' : w.id === lastPick ? ' tile--incorrect' : ''}`}
            aria-label={w.en}
            data-testid={`picture-${w.id}`}
            disabled={!answering || done(w) || !selected}
            onClick={() => onPicture(w)}
          >
            <WordPicture picture={w.picture} />
          </button>
        ))}
      </div>
    </div>
  )
}
