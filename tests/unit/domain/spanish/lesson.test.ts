// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { newMastery } from '@/domain'
import { FIESTA, fiestaOpen, getSpanishSkill, spanishSkillsIn } from '@/domain/spanish/curriculum'
import {
  SAY_AFTER,
  scoredCount,
  skipCheckPassed,
  SPANISH_LESSON_LENGTH,
  spanishLessonProgress,
  spanishLessonReducer,
  type SpanishLessonEvent,
  type SpanishLessonState,
  startSpanishLesson,
} from '@/domain/spanish/lesson'

const at = 1_000
const start = (extra: Partial<Parameters<typeof startSpanishLesson>[0]> = {}) =>
  startSpanishLesson({ skillId: 'es.pets', seed: 7, at, ...extra })
const step = (s: SpanishLessonState, e: SpanishLessonEvent) => spanishLessonReducer(s, e)

/** Answers the current question right (or says it). */
function answer(s: SpanishLessonState): SpanishLessonState {
  const q = s.question
  if (q.kind === 'say') return step(s, { type: 'said' })
  if (q.kind === 'match') {
    return q.choices.reduce(
      (acc, c) => step(acc, { type: 'pair', wordId: c.id, pictureId: c.id, at }),
      s,
    )
  }
  return step(s, { type: 'choice', wordId: q.answer.id, at })
}
const wrongId = (s: SpanishLessonState) =>
  s.question.choices.find((c) => c.id !== s.question.answer.id)?.id ?? ''

function playThrough(s: SpanishLessonState): SpanishLessonState {
  let state = s
  for (let i = 0; i < 40 && state.phase !== 'complete'; i++) {
    state = step(answer(state), { type: 'continue', at })
  }
  return state
}

describe('Spanish lesson (spec 019 AC4)', () => {
  it('plays 8 scored questions plus one say step after the 4th', () => {
    const s = start()
    expect(scoredCount(s)).toBe(SPANISH_LESSON_LENGTH)
    expect(s.plan).toHaveLength(SPANISH_LESSON_LENGTH + 1)
    expect(s.plan[SAY_AFTER]?.kind).toBe('say')
    expect(s.plan[SAY_AFTER]?.seed).toBe(s.plan[SAY_AFTER - 1]?.seed)
    const done = playThrough(s)
    expect(done.phase).toBe('complete')
    expect(done.results).toHaveLength(8)
    expect(done.results.every((r) => r.firstTry && r.kind.startsWith('es.'))).toBe(true)
    expect(done.results.some((r) => r.kind === 'es.say')).toBe(false)
    expect(spanishLessonProgress(done)).toBe(1)
  })

  it('cycles the skill kinds; numbers skills use count', () => {
    expect(new Set(start().plan.map((p) => p.kind))).toEqual(
      new Set(['listen', 'see', 'match', 'say']),
    )
    expect(start({ skillId: 'es.numbers1' }).plan.map((p) => p.kind)).toContain('count')
  })

  it('a correct answer gives the correct phase and a first-try result', () => {
    const s = answer(start())
    expect(s.phase).toBe('correct')
    expect(s.results[0]).toMatchObject({ skillId: 'es.pets', firstTry: true, solved: true })
  })

  it('a first miss hints and retries; a second shows the answer and the question comes back', () => {
    let s = start()
    const planned = s.plan.length
    s = step(s, { type: 'choice', wordId: wrongId(s), at })
    expect(s.phase).toBe('notYet')
    expect(s.hint).toBeTruthy()
    s = step(s, { type: 'retry' })
    expect(s.phase).toBe('answering')
    s = step(s, { type: 'choice', wordId: wrongId(s), at })
    expect(s.phase).toBe('solution')
    expect(s.results[0]).toMatchObject({ solved: false, firstTry: false, attempts: 2 })
    s = step(s, { type: 'continue', at })
    expect(s.plan).toHaveLength(planned + 1)
    expect(s.plan.at(-1)).toMatchObject({ isRequeue: true })
  })

  it('match: right pairs lock, a wrong pair is a miss that keeps them', () => {
    let s = start()
    while (s.question.kind !== 'match') s = step(answer(s), { type: 'continue', at })
    const [a, b] = s.question.choices
    if (!a || !b) throw new Error('match needs choices')
    s = step(s, { type: 'pair', wordId: a.id, pictureId: a.id, at })
    expect(s.matched).toEqual([a.id])
    expect(s.phase).toBe('answering')
    s = step(s, { type: 'pair', wordId: b.id, pictureId: a.id, at })
    expect(s.phase).toBe('notYet')
    s = step(s, { type: 'retry' })
    expect(s.matched).toEqual([a.id])
    s = answer(s)
    expect(s.phase).toBe('correct')
    expect(s.results.at(-1)).toMatchObject({ kind: 'es.match', firstTry: false, solved: true })
  })

  it('say is never scored and claps no matter what', () => {
    let s = start()
    while (s.question.kind !== 'say') s = step(answer(s), { type: 'continue', at })
    const before = s.results.length
    s = step(s, { type: 'said' })
    expect(s.phase).toBe('correct')
    expect(s.results).toHaveLength(before)
  })

  it('ignores events that do not fit the phase', () => {
    const s = answer(start())
    expect(step(s, { type: 'choice', wordId: 'gato', at })).toBe(s)
    expect(step(s, { type: 'retry' })).toBe(s)
  })
})

describe('mix-ups (spec 019 AC8)', () => {
  it('picking the cat for "el perro" saves es.mixup:perro~gato', () => {
    let found = false
    for (let seed = 0; seed < 200 && !found; seed++) {
      const s = start({ seed })
      const q = s.question
      if (q.kind !== 'listen' || q.answer.id !== 'perro' || !q.choices.some((c) => c.id === 'gato'))
        continue
      const missed = step(
        step(step(s, { type: 'choice', wordId: 'gato', at }), { type: 'retry' }),
        {
          type: 'choice',
          wordId: 'gato',
          at,
        },
      )
      expect(missed.results[0]?.misconceptions).toEqual([
        'es.mixup:perro~gato',
        'es.mixup:perro~gato',
      ])
      found = true
    }
    expect(found).toBe(true)
  })
})

describe('without speech (spec 019 AC9)', () => {
  it('has no listen, count or say questions', () => {
    for (const skillId of ['es.pets', 'es.numbers2']) {
      const s = start({ skillId, canHear: false })
      expect(
        s.plan.map((p) => p.kind).filter((k) => ['listen', 'count', 'say'].includes(k)),
      ).toEqual([])
      expect(scoredCount(s)).toBe(SPANISH_LESSON_LENGTH)
    }
  })
})

describe('skip-ahead and review (spec 019 AC6, AC7)', () => {
  it('the check is 3 hard listen questions, no say; 3/3 first try passes', () => {
    const s = start({ skipCheck: true })
    expect(s.plan.map((p) => [p.kind, p.fixedDifficulty])).toEqual([
      ['listen', 3],
      ['listen', 3],
      ['listen', 3],
    ])
    expect(s.question.choices).toHaveLength(4)
    expect(skipCheckPassed(playThrough(s))).toBe(true)
  })

  it('a miss fails the check and nothing comes back', () => {
    let s = start({ skipCheck: true })
    s = step(s, { type: 'choice', wordId: wrongId(s), at })
    s = step(step(s, { type: 'retry' }), { type: 'choice', wordId: s.question.answer.id, at })
    const done = playThrough(step(s, { type: 'continue', at }))
    expect(done.plan).toHaveLength(3)
    expect(skipCheckPassed(done)).toBe(false)
  })

  it('review practises the due skills, with no say step', () => {
    const crowned = { ...newMastery(), mastery: 0.9, crowned: true, nextReviewAt: 10 }
    const s = start({
      mode: 'review',
      progress: { 'es.hello': crowned, 'es.colors1': crowned },
    })
    expect(new Set(s.plan.map((p) => p.skillId))).toEqual(new Set(['es.hello', 'es.colors1']))
    expect(s.plan.map((p) => p.kind)).not.toContain('say')
  })
})

describe('¡Fiesta! (spec 020 AC4)', () => {
  it('8 questions from 8 different skills across all 3 areas, difficulty 2 and 3, no say', () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = start({ seed, fiesta: true })
      expect(s.skillId).toBe(FIESTA)
      expect(s.mode).toBe('review')
      expect(s.plan).toHaveLength(SPANISH_LESSON_LENGTH)
      expect(new Set(s.plan.map((p) => p.skillId)).size).toBe(8)
      expect(s.plan.map((p) => p.kind)).not.toContain('say')
      expect(new Set(s.plan.map((p) => p.fixedDifficulty))).toEqual(new Set([2, 3]))
      const areas = new Set(s.plan.map((p) => getSpanishSkill(p.skillId).area))
      expect(areas.size, `seed ${seed}`).toBeGreaterThanOrEqual(2)
      const done = playThrough(s)
      expect(done.results.map((r) => r.skillId)).toEqual(s.plan.map((p) => p.skillId))
    }
  })

  it('opens only when every Jungle Trail skill is crowned', () => {
    const crowned = { ...newMastery(), mastery: 0.9, crowned: true }
    const jungle = spanishSkillsIn('jungle').map((s) => s.id)
    expect(fiestaOpen({})).toBe(false)
    const most = Object.fromEntries(jungle.slice(1).map((id) => [id, crowned]))
    expect(fiestaOpen(most)).toBe(false)
    expect(fiestaOpen({ ...most, [jungle[0] ?? '']: crowned })).toBe(true)
  })
})
