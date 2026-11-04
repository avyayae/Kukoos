import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speakParts } from '@/audio/tts'
import type { Repositories } from '@/data'
import type { CourseId } from '@/domain'
import { FIESTA, SPANISH_SKILLS, spanishSkillsIn } from '@/domain/spanish/curriculum'
import {
  spanishLessonReducer,
  type SpanishLessonState,
  startSpanishLesson,
} from '@/domain/spanish/lesson'
import { testStore } from '../withData'
import { renderAt } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  speakParts: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

interface Voice {
  name: string
  lang: string
  voiceURI: string
  localService: boolean
}
let voices: Voice[] = []
const ARIA: Voice = { name: 'Aria', lang: 'en-US', voiceURI: 'aria', localService: true }
const PAULINA: Voice = { name: 'Paulina', lang: 'es-MX', voiceURI: 'paulina', localService: true }

beforeEach(() => {
  vi.mocked(speakParts).mockClear()
  voices = [ARIA, PAULINA]
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => voices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      text = ''
    },
  })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

async function kid(repos: Repositories, courses: CourseId[] = ['spanish']) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, { courses })
  return id
}

/** Crowns skills as a passed skip-ahead check would (enough to open the fiesta). */
async function crown(repos: Repositories, id: string, skillIds: string[]) {
  for (const skillId of skillIds) await repos.progress.markMastered(id, skillId)
}

describe('Hola Island map (spec 020 AC1, AC2)', () => {
  it('shows 3 areas and 18 stops in order, with ¡Fiesta! locked at the top', async () => {
    const { repos } = testStore()
    await kid(repos)
    renderAt('/', repos)
    const island = await screen.findByTestId('hola-island')
    const areas = within(island).getAllByRole('region')
    expect(areas.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Harbor',
      'Market',
      'Jungle Trail',
    ])
    const stops = within(island)
      .getAllByRole('button', { name: /^Mission/ })
      .map((b) => b.dataset.testid)
    expect(stops).toEqual(SPANISH_SKILLS.map((s) => `node-${s.id}`))
    expect(screen.getByTestId('node-es.hello')).toHaveAccessibleName(
      'Mission 1, Hello!, start here',
    )
    expect(screen.getByTestId('node-es-fiesta')).toHaveAccessibleName('¡Fiesta!, locked')
  })

  it('area signs say their name in Spanish, then English', async () => {
    const { repos } = testStore()
    await kid(repos)
    renderAt('/', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Market, El mercado' }))
    expect(speakParts).toHaveBeenLastCalledWith([{ es: 'El mercado' }, 'the Market'])
  })

  it('a locked stop and a locked fiesta do not open', async () => {
    const { repos } = testStore()
    await kid(repos)
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByTestId('node-es.colors1'))
    await userEvent.click(screen.getByTestId('node-es-fiesta'))
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('the Spanish voice note (spec 020 AC7)', () => {
  it('shows when the device speaks but has no Spanish voice', async () => {
    voices = [ARIA]
    const { repos } = testStore()
    await kid(repos)
    renderAt('/', repos)
    expect(await screen.findByTestId('spanish-needs-voice')).toHaveTextContent(
      'add a Spanish voice',
    )
  })

  it('stays hidden with a Spanish voice', async () => {
    const { repos } = testStore()
    await kid(repos)
    renderAt('/', repos)
    await screen.findByTestId('hola-island')
    expect(screen.queryByTestId('spanish-needs-voice')).toBeNull()
  })

  it('stays hidden while the browser is still loading its voices', async () => {
    voices = []
    const { repos } = testStore()
    await kid(repos)
    renderAt('/', repos)
    await screen.findByTestId('hola-island')
    expect(screen.queryByTestId('spanish-needs-voice')).toBeNull()
  })
})

describe('Hola Island stickers in the Trophy Room (spec 020 AC3)', () => {
  it('only Spanish learners see them', async () => {
    const math = testStore()
    renderAt('/trophies', math.repos)
    await screen.findByTestId('badge-first-flight')
    expect(screen.queryByTestId('badge-es.area.harbor')).toBeNull()

    const spanish = testStore()
    await kid(spanish.repos)
    renderAt('/trophies', spanish.repos)
    expect(await screen.findByTestId('badge-es.area.harbor')).toBeInTheDocument()
    expect(screen.getByTestId('badge-es.area.jungle')).toHaveTextContent('Fiesta piñata')
  })
})

const at = 0
function solved(s: SpanishLessonState): SpanishLessonState {
  const q = s.question
  if (q.kind === 'match') {
    return q.choices.reduce(
      (acc, c) => spanishLessonReducer(acc, { type: 'pair', wordId: c.id, pictureId: c.id, at }),
      s,
    )
  }
  return spanishLessonReducer(s, { type: 'choice', wordId: q.answer.id, at })
}

async function playFiesta(seed: number) {
  let s = startSpanishLesson({ skillId: FIESTA, seed, at, fiesta: true })
  while (s.phase !== 'complete') {
    const q = s.question
    await screen.findByTestId('spanish-lesson')
    if (q.kind === 'match') {
      for (const c of q.choices) {
        await userEvent.click(screen.getByTestId(`word-${c.id}`))
        await userEvent.click(screen.getByTestId(`picture-${c.id}`))
      }
    } else {
      const tile = screen.getByTestId(`choice-${q.answer.id}`)
      await userEvent.click(tile)
      if (q.kind === 'see') await userEvent.click(tile)
    }
    await userEvent.click(
      within(await screen.findByTestId('feedback')).getByRole('button', { name: 'Continue' }),
    )
    s = spanishLessonReducer(solved(s), { type: 'continue', at })
  }
  await screen.findByRole('heading', { name: 'Mission complete!' })
  // Through the shared celebration, until the fiesta moment or the island shows.
  const ended = () => screen.queryByTestId('fiesta-moment') ?? screen.queryByTestId('hola-island')
  for (let i = 0; i < 20 && !ended(); i++) {
    const next = await waitFor(() => {
      const button = ended() ? null : screen.queryAllByRole('button', { name: 'Continue' })[0]
      if (!button && !ended()) throw new Error('waiting for the next moment')
      return button
    })
    if (next) await userEvent.click(next)
  }
}

describe('¡Fiesta! (spec 020 AC4)', () => {
  it('opens once the Jungle Trail is crowned; the first finish throws a party, once', async () => {
    const { repos } = testStore()
    const id = await kid(repos)
    await crown(
      repos,
      id,
      spanishSkillsIn('jungle').map((s) => s.id),
    )
    const router = renderAt('/', repos)
    const fiesta = await screen.findByTestId('node-es-fiesta')
    await waitFor(() => expect(fiesta).toHaveAccessibleName('¡Fiesta!, open'))
    await userEvent.click(fiesta)
    expect(router.state.location.pathname).toBe('/spanish/lesson/es.fiesta')

    await router.navigate('/spanish/lesson/es.fiesta?seed=3')
    await playFiesta(3)
    expect(await screen.findByTestId('fiesta-moment')).toHaveTextContent('¡Fiesta!')
    expect(speakParts).toHaveBeenCalledWith([{ es: '¡Fiesta!' }, expect.any(String)])
    await userEvent.click(screen.getByRole('button', { name: 'Back to the island' }))
    const done = await screen.findByTestId('node-es-fiesta')
    await waitFor(() => expect(done).toHaveAccessibleName('¡Fiesta!, crowned'))

    // A replay: no second party.
    await router.navigate('/spanish/lesson/es.fiesta?seed=4')
    await playFiesta(4)
    expect(await screen.findByTestId('hola-island')).toBeInTheDocument()
    expect(screen.queryByTestId('fiesta-moment')).toBeNull()
  }, 30_000)

  it('stays shut by URL before the Jungle Trail is crowned', async () => {
    const { repos } = testStore()
    await kid(repos)
    renderAt('/spanish/lesson/es.fiesta', repos)
    expect(
      await screen.findByText('The fiesta starts when the Jungle Trail is crowned.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('spanish-lesson')).toBeNull()
  })
})

describe('Goodnight offers every open course (spec 020 AC6)', () => {
  it('Math + Spanish: offered Spanish, and it opens', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'spanish'])
    await repos.time.addActive(id, 0, 60 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('goodnight')).toHaveTextContent(
      'Math is sleeping. Want to learn Spanish?',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Learn Spanish' }))
    expect(await screen.findByTestId('spanish-home')).toBeInTheDocument()
  })

  it('Math + Chess + Spanish: offered both; a course at its own limit is not', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess', 'spanish'])
    await repos.time.addActive(id, 0, 60 * 60)
    renderAt('/', repos)
    const night = await screen.findByTestId('goodnight')
    expect(night).toHaveTextContent('Want to play chess or learn Spanish?')
    expect(within(night).getByRole('button', { name: 'Play chess' })).toBeInTheDocument()
    expect(within(night).getByRole('button', { name: 'Learn Spanish' })).toBeInTheDocument()
  })

  it('leaves out Spanish when its own limit is reached', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess', 'spanish'])
    const settings = await repos.time.settings(id)
    await repos.time.setSettings(id, { ...settings, spanishLimitMin: 15 })
    await repos.time.addSpanish(id, 15 * 60)
    await repos.time.addActive(id, 0, 60 * 60)
    renderAt('/', repos)
    const night = await screen.findByTestId('goodnight')
    expect(night).toHaveTextContent('Want to play chess?')
    expect(within(night).queryByRole('button', { name: 'Learn Spanish' })).toBeNull()
  })
})
