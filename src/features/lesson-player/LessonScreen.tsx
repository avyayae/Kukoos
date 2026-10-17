import { useEffect, useEffectEvent, useReducer, useState } from 'react'
import { cancelSpeech, speak } from '@/audio/tts'
import {
  type Difficulty,
  getSkill,
  hintFor,
  lessonProgress,
  lessonReducer,
  type Response,
  type SkillId,
  solutionFor,
  startLesson,
} from '@/domain'
import { newId, useCurrentProfile, useRepos } from '@/data'
import { RENDERERS } from '@/question-kinds/registry'
import type { FeedbackState } from '@/question-kinds/types'
import {
  Button3D,
  ConfirmSheet,
  FeedbackBanner,
  Kukoos,
  type KukoosMood,
  ProgressBar,
  SpeakButton,
} from '@/ui'
import { pick, praiseFor, say, t } from './copy'
import { LessonComplete } from './LessonComplete'
import { BlocksPicture, WorkedSteps } from './VisualHint'

interface LessonScreenProps {
  skillId: SkillId
  seed: number
  startDifficulty?: Difficulty
  onExit: () => void
  /** Injectable clock for tests. */
  now?: () => number
}

const FEEDBACK: Record<string, FeedbackState> = {
  answering: 'none',
  correct: 'correct',
  notYet: 'incorrect',
  solution: 'solution',
}

/**
 * The core loop (spec 005): one question at a time, CHECK, gentle feedback with a
 * targeted hint, retry, worked solution, re-queue, and a summary at the end.
 */
export function LessonScreen({
  skillId,
  seed,
  startDifficulty = 2,
  onExit,
  now = Date.now,
}: LessonScreenProps) {
  const skill = getSkill(skillId)
  const [state, dispatch] = useReducer(lessonReducer, undefined, () =>
    startLesson({ skillId, seed, difficulty: startDifficulty, at: now() }),
  )
  const [response, setResponse] = useState<Response | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [retries, setRetries] = useState(0)
  const [autoRead, setAutoRead] = useState(true)
  const [showMe, setShowMe] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  // --- saving (spec 004): one stable id per lesson makes saving idempotent
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [lessonId] = useState(newId)
  const saveLesson = (s: typeof state) => {
    if (!profile) return Promise.resolve()
    return repos.lessons
      .save(s, { lessonId, profileId: profile.id })
      .then(() => repos.storage.requestPersistence())
      .then(() => undefined)
      .catch(() => undefined)
  }
  const saveOnComplete = useEffectEvent(() => void saveLesson(state))
  useEffect(() => {
    if (state.phase === 'complete') saveOnComplete()
  }, [state.phase, profile])
  const leave = () => {
    // Early exit keeps answered questions (saved as completed: false).
    void saveLesson(state)
    onExit()
  }

  const q = state.question
  const { phase } = state
  const questionKey = `${state.index}:${q.id}`
  const rendererKey = `${questionKey}:${retries}`
  const feedback = FEEDBACK[phase] ?? 'none'

  // --- banner content
  let banner: { variant: 'correct' | 'notYet' | 'solution'; title: string; body?: string } | null =
    null
  if (phase === 'correct')
    banner = { variant: 'correct', title: praiseFor(skill.worldId, q.seed + state.index) }
  if (phase === 'notYet')
    banner = {
      variant: 'notYet',
      title: pick('notYet', q.seed),
      body: say(hintFor(q, state.lastCheck)),
    }
  if (phase === 'solution')
    banner = { variant: 'solution', title: t('solution:title'), body: say(solutionFor(q)) }
  const announcement = banner ? [banner.title, banner.body].filter(Boolean).join(' ') : ''

  // --- speech
  // Read each new question (and re-read it when reading aloud is switched back on).
  const promptSpeech = q.prompt.speech
  useEffect(() => {
    if (autoRead && phase === 'answering') speak(promptSpeech)
  }, [rendererKey, autoRead, phase, promptSpeech])
  useEffect(() => {
    if (autoRead && announcement) speak(announcement)
  }, [announcement, autoRead])
  useEffect(() => cancelSpeech, [])

  // --- actions
  const submit = () => {
    if (phase !== 'answering' || !response) return
    dispatch({ type: 'answer', response, at: now() })
  }

  const retry = () => {
    dispatch({ type: 'retry' })
    setRetries((r) => r + 1)
    setResponse(null)
    setBubble(null)
    setShowMe(false)
  }

  const advance = () => {
    dispatch({ type: 'continue', at: now() })
    setResponse(null)
    setBubble(null)
    setShowMe(false)
  }

  // Enter = CHECK / TRY AGAIN / CONTINUE (a focused button handles its own Enter).
  // Handled on keyup: on keydown, the banner would appear and focus its button before the
  // same key press finished, and that press would then also click CONTINUE, skipping feedback.
  const onEnter = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Enter' || confirmExit || showMe) return
    if (e.target instanceof HTMLButtonElement) return
    if (phase === 'answering') submit()
    else if (phase === 'notYet') retry()
    else if (phase === 'correct' || phase === 'solution') advance()
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => onEnter(e)
    window.addEventListener('keyup', onKey)
    return () => window.removeEventListener('keyup', onKey)
  }, [])

  if (phase === 'complete') {
    return <LessonComplete state={state} autoRead={autoRead} onContinue={onExit} />
  }

  const Renderer = RENDERERS[q.kind]
  const usesDisplayAsPrompt =
    'display' in q.payload && q.payload.display.type !== 'equation' && q.kind !== 'trueFalse'
  const bubbleText = bubble ?? (usesDisplayAsPrompt ? q.prompt.text : t(`instruction:${q.kind}`))
  const mood: KukoosMood =
    phase === 'correct'
      ? state.combo >= 3
        ? 'cheer'
        : 'happy'
      : phase === 'notYet' || phase === 'solution'
        ? 'encourage'
        : state.guided
          ? 'think'
          : 'idle'

  return (
    <main className="lesson screen" data-phase={phase}>
      <header className="lesson__top">
        <button
          type="button"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Leave lesson"
          onClick={() => setConfirmExit(true)}
        >
          ✕
        </button>
        <ProgressBar value={lessonProgress(state)} hot={state.combo >= 3} />
        {state.combo >= 3 && (
          <span className="pill pill--streak" key={state.combo} aria-label={`Combo ${state.combo}`}>
            🔥 {state.combo}
          </span>
        )}
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
        <Kukoos mood={mood} size={64} beat={`${questionKey}:${phase}`}>
          <span data-testid="bubble-text">{bubbleText}</span>
        </Kukoos>
        <SpeakButton text={[q.prompt.speech, bubble].filter(Boolean).join(' ')} />
      </div>

      <div className="lesson__question">
        <Renderer
          key={rendererKey}
          question={q}
          guided={state.guided}
          locked={phase !== 'answering'}
          feedback={feedback}
          wrongResponses={state.wrongResponses}
          onChange={setResponse}
          onBubble={setBubble}
        />
      </div>

      <div className="lesson__check">
        {phase === 'answering' && (
          <Button3D variant="primary" size="xl" block disabled={!response} onClick={submit}>
            Check
          </Button3D>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {banner && (
        <FeedbackBanner
          variant={banner.variant}
          title={banner.title}
          {...(banner.body ? { body: banner.body } : {})}
          actionLabel={phase === 'notYet' ? 'Try again' : 'Continue'}
          onAction={phase === 'notYet' ? retry : advance}
          {...(phase === 'notYet'
            ? { secondary: { label: 'Show me', onClick: () => setShowMe(true) } }
            : {})}
        >
          {phase === 'solution' && <WorkedSteps q={q} />}
        </FeedbackBanner>
      )}

      {showMe && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Show me">
            <BlocksPicture q={q} />
            <Button3D variant="primary" size="xl" block onClick={() => setShowMe(false)}>
              Got it
            </Button3D>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={confirmExit}
        title={t('lesson:leaveTitle')}
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={leave}
        onCancel={() => setConfirmExit(false)}
      />
    </main>
  )
}
