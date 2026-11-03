import type { SavedLesson } from '@/domain'
import type { NewRow } from './write'
import { newId } from './write'

export interface LessonMeta {
  /** Stable for the whole lesson, so saving twice is idempotent. */
  lessonId: string
  profileId: string
}

/** Domain lesson state → one lesson row + one attempt row per answered question. */
export function lessonToRows(
  state: SavedLesson,
  { lessonId, profileId }: LessonMeta,
  at: number,
): { lesson: NewRow<'lessons'>; attempts: NewRow<'attempts'>[] } {
  const endedAt = state.endedAt ?? at
  const lesson: NewRow<'lessons'> = {
    id: lessonId,
    profileId,
    skillId: state.skillId,
    mode: state.mode,
    ...(state.worldId ? { worldId: state.worldId } : {}),
    seed: state.seed,
    startedAt: state.startedAt,
    endedAt,
    completed: state.phase === 'complete',
    questionCount: state.results.length,
    firstTryCorrect: state.results.filter((r) => r.firstTry).length,
    bestCombo: state.bestCombo,
    durationMs: Math.max(0, endedAt - state.startedAt),
  }
  const attempts: NewRow<'attempts'>[] = state.results.map((r) => ({
    id: newId(),
    profileId,
    lessonId,
    skillId: r.skillId,
    questionId: r.questionId,
    kind: r.kind,
    difficulty: r.difficulty,
    firstTry: r.firstTry,
    solved: r.solved,
    attempts: r.attempts,
    misconceptions: [...r.misconceptions],
    at: r.at,
  }))
  return { lesson, attempts }
}
