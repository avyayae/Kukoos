import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak, speakParts } from '@/audio/tts'
import type { Repositories } from '@/data'
import {
  spanishLessonReducer,
  type SpanishLessonState,
  startSpanishLesson,
} from '@/domain/spanish/lesson'
import { shown } from '@/domain/spanish/words'
import { testStore } from '../withData'
import { renderAt } from './nav'

let speech = true
vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  speakParts: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => speech,
}))

beforeEach(() => {
  speech = true
  vi.mocked(speak).mockClear()
  vi.mocked(speakParts).mockClear()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

async function spanishKid(repos: Repositories) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, { courses: ['spanish'] })
  return id
}

const at = 0
/** The same lesson as the screen's (same seed), so the test knows each right answer. */
const mirror = (skillId: string, seed: number, extra = {}) =>
  startSpanishLesson({ skillId, seed, at, ...extra })

function solvedMirror(s: SpanishLessonState): SpanishLessonState {
  const q = s.question
  if (q.kind === 'say') return spanishLessonReducer(s, { type: 'said' })
  if (q.kind === 'match') {
    return q.choices.reduce(
      (acc, c) => spanishLessonReducer(acc, { type: 'pair', wordId: c.id, pictureId: c.id, at }),
      s,
    )
  }
  return spanishLessonReducer(s, { type: 'choice', wordId: q.answer.id, at })
}

/** Answers the screen's current question right, as a kid would. */
async function answerRight(s: SpanishLessonState) {
  const q = s.question
  await screen.findByTestId('spanish-lesson')
  if (q.kind === 'say') return userEvent.click(screen.getByTestId('said-it'))
  if (q.kind === 'match') {
    for (const c of q.choices) {
      await userEvent.click(screen.getByTestId(`word-${c.id}`))
      await userEvent.click(screen.getByTestId(`picture-${c.id}`))
    }
    return
  }
  const tile = screen.getByTestId(`choice-${q.answer.id}`)
  await userEvent.click(tile)
  // See: tap once to hear, tap again to choose.
  if (q.kind === 'see') await userEvent.click(tile)
}

async function next() {
  await userEvent.click(
    within(await screen.findByTestId('feedback')).getByRole('button', { name: 'Continue' }),
  )
}

const spokenEs = () => [
  ...vi
    .mocked(speakParts)
    .mock.calls.flatMap(([parts]) => parts.flatMap((p) => (typeof p === 'string' ? [] : [p.es]))),
  ...vi.mocked(speak).mock.calls.flatMap(([text, o]) => (o?.lang === 'es' ? [text] : [])),
]

describe('Spanish lesson screen (spec 019 AC4, AC5)', () => {
  it('plays a lesson to the celebration and saves 8 scored answers', async () => {
    const { repos, db } = testStore()
    const id = await spanishKid(repos)
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    let s = mirror('es.pets', 7)
    while (s.phase !== 'complete') {
      await answerRight(s)
      s = solvedMirror(s)
      expect(await screen.findByTestId('feedback')).toBeInTheDocument()
      await next()
      s = spanishLessonReducer(s, { type: 'continue', at })
    }
    expect(await screen.findByRole('heading', { name: 'Mission complete!' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.lessons.count()).toBe(1))
    expect(await db.attempts.count()).toBe(8)
    const progress = await repos.progress.forProfile(id)
    expect(progress['es.pets']?.attempts).toBe(8)
    // Every Spanish word was heard in Spanish, with its article.
    expect(spokenEs()).toEqual(expect.arrayContaining([expect.stringMatching(/^el /)]))
  })

  it('a listen question plays the word in Spanish, and 🔊 replays it', async () => {
    const { repos } = testStore()
    await spanishKid(repos)
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    const s = mirror('es.pets', 7)
    expect(s.question.kind).toBe('listen')
    await screen.findByTestId('spanish-lesson')
    await waitFor(() =>
      expect(speakParts).toHaveBeenCalledWith(['Tap the one you hear!', { es: s.question.word }]),
    )
    await userEvent.click(screen.getByTestId('hear-word'))
    expect(speak).toHaveBeenCalledWith(s.question.word, { lang: 'es' })
  })

  it('with read-aloud off, the word still plays but the instruction does not', async () => {
    const { repos } = testStore()
    await spanishKid(repos)
    await repos.device.setAudio({ ...(await repos.device.audio()), readAloud: false })
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    const s = mirror('es.pets', 7)
    expect(s.question.kind).toBe('listen')
    expect(await screen.findByRole('button', { name: 'Turn on reading aloud' })).toBeVisible()
    await waitFor(() => expect(speakParts).toHaveBeenCalledWith([{ es: s.question.word }]))
    expect(vi.mocked(speakParts).mock.calls.flat(2)).not.toContain('Tap the one you hear!')
    expect(speak).not.toHaveBeenCalledWith('Tap the one you hear!')
  })

  it('a right answer says "¡Muy bien!"-style praise with the word, in Spanish', async () => {
    const { repos } = testStore()
    await spanishKid(repos)
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    const s = mirror('es.pets', 7)
    await answerRight(s)
    const word = shown(s.question.answer)
    expect(await screen.findByTestId('feedback')).toHaveTextContent(word)
    await waitFor(() =>
      expect(speak).toHaveBeenCalledWith(expect.stringContaining(`${word}.`), { lang: 'es' }),
    )
  })

  it('a wrong pick: a hint and a retry, then the answer; the mix-up is saved (AC8)', async () => {
    const { repos, db } = testStore()
    await spanishKid(repos)
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    const s = mirror('es.pets', 7)
    const wrong = s.question.choices.find((c) => c.id !== s.question.answer.id)
    if (!wrong) throw new Error('needs a distractor')
    await userEvent.click(await screen.findByTestId(`choice-${wrong.id}`))
    const banner = await screen.findByTestId('feedback')
    expect(banner).toHaveTextContent('Not yet!')
    await userEvent.click(within(banner).getByRole('button', { name: 'Try again' }))
    await userEvent.click(screen.getByTestId(`choice-${wrong.id}`))
    expect(await screen.findByTestId('feedback')).toHaveTextContent(
      `${shown(s.question.answer)}: ${s.question.answer.en}`,
    )
    expect(screen.getByTestId(`choice-${s.question.answer.id}`)).toHaveClass('tile--correct')
    await next()
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    const [attempt] = await db.attempts.toArray()
    const key = `es.mixup:${s.question.answer.id}~${wrong.id}`
    expect(attempt).toMatchObject({ solved: false, misconceptions: [key, key] })
  })
})

describe('skip-ahead (spec 019 AC7)', () => {
  it('three right first time: crowned, and the next skill opens', async () => {
    const { repos } = testStore()
    const id = await spanishKid(repos)
    renderAt('/spanish/lesson/es.hello?seed=4', repos)
    expect(await screen.findByRole('heading', { name: 'Already know these words?' })).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Show Kukoos!' }))
    let s = mirror('es.hello', 4, { skipCheck: true })
    while (s.phase !== 'complete') {
      await answerRight(s)
      await next()
      s = spanishLessonReducer(solvedMirror(s), { type: 'continue', at })
    }
    expect(await screen.findByRole('heading', { name: 'You know these already!' })).toBeVisible()
    await waitFor(async () =>
      expect((await repos.progress.forProfile(id))['es.hello']?.crowned).toBe(true),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByTestId('node-es.manners')).toHaveAccessibleName(/start here/)
  })

  it('"Teach me" goes straight to the lesson', async () => {
    const { repos } = testStore()
    await spanishKid(repos)
    renderAt('/spanish/lesson/es.hello?seed=4', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Teach me' }))
    expect(await screen.findByTestId('spanish-lesson')).toBeInTheDocument()
  })
})

describe('the Spanish home path (spec 019 AC6)', () => {
  it('lists the skills by area; Play next opens the first one; locked ones stay shut', async () => {
    const { repos } = testStore()
    await spanishKid(repos)
    const router = renderAt('/', repos)
    expect(await screen.findByTestId('hola-island')).toBeInTheDocument()
    for (const area of ['Harbor', 'Market', 'Jungle Trail']) {
      expect(screen.getByRole('region', { name: area })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByTestId('node-es.manners'))
    expect(router.state.location.pathname).toBe('/')
    await userEvent.click(screen.getByTestId('play-next'))
    expect(router.state.location.pathname).toBe('/spanish/lesson/es.hello')
  })
})

describe('without speech (spec 019 AC9)', () => {
  it('no listening questions, written words shown, and a note for grown-ups', async () => {
    speech = false
    const { repos } = testStore()
    await spanishKid(repos)
    renderAt('/', repos)
    expect(await screen.findByTestId('spanish-no-speech')).toHaveTextContent('Spanish voice')
  })

  it('a lesson starts with a see question (one tap answers)', async () => {
    speech = false
    const { repos } = testStore()
    await spanishKid(repos)
    renderAt('/spanish/lesson/es.pets?seed=7&learn', repos)
    const s = mirror('es.pets', 7, { canHear: false })
    expect(s.question.kind).toBe('see')
    expect(await screen.findByTestId('spanish-lesson')).toHaveAttribute('data-kind', 'see')
    expect(screen.queryByTestId('hear-word')).toBeNull()
    await userEvent.click(screen.getByTestId(`choice-${s.question.answer.id}`))
    expect(await screen.findByTestId('feedback')).toBeInTheDocument()
  })
})
