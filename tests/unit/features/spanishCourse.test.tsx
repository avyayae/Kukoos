import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak, speakParts } from '@/audio/tts'
import type { Repositories } from '@/data'
import type { CourseId } from '@/domain'
import { testStore } from '../withData'
import { renderAt, renderGrownUp } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  speakParts: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

let voices: { name: string; lang: string; voiceURI: string; localService: boolean }[] = []

beforeEach(() => {
  vi.mocked(speak).mockClear()
  vi.mocked(speakParts).mockClear()
  vi.stubEnv('VITE_SPANISH', '1')
  voices = []
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
  // The real support check also needs the utterance class.
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      text = ''
    },
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

async function kid(repos: Repositories, courses: CourseId[], currentCourse?: CourseId) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, currentCourse ? { courses, currentCourse } : { courses })
  return id
}

describe('the Spanish course (spec 018 AC1, AC2)', () => {
  it('My courses offers Spanish (💬 Español) only when the build has it', async () => {
    const { repos } = testStore()
    renderAt('/me', repos)
    const spanish = await screen.findByTestId('course-card-spanish')
    expect(spanish).toHaveTextContent('Spanish')
    expect(spanish).toHaveTextContent('Español')
    expect(spanish).toHaveTextContent('💬')
  })

  it('is hidden without the gate', async () => {
    vi.stubEnv('VITE_SPANISH', '')
    const { repos } = testStore()
    await kid(repos, ['math', 'chess'])
    renderAt('/me', repos)
    expect(await screen.findByTestId('course-card-chess')).toBeInTheDocument()
    expect(screen.queryByTestId('course-card-spanish')).toBeNull()
  })

  it('a Spanish-only kid sees the Spanish home, and Kukoos says ¡Hola! in Spanish', async () => {
    const { repos } = testStore()
    await kid(repos, ['spanish'])
    renderAt('/', repos)
    expect(await screen.findByTestId('spanish-home')).toBeInTheDocument()
    expect(screen.queryByTestId('journey')).toBeNull()
    expect(screen.queryByRole('radiogroup', { name: 'Courses' })).toBeNull()
    await waitFor(() =>
      expect(speakParts).toHaveBeenCalledWith([
        { es: '¡Hola!' },
        expect.stringMatching(/Hola Island/),
      ]),
    )
    await userEvent.click(screen.getByTestId('spanish-hello'))
    expect(vi.mocked(speakParts).mock.calls.length).toBeGreaterThan(1)
  })

  it('switches from math to Spanish in one tap; math and chess stay as they were', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess', 'spanish'])
    await repos.progress.markMastered(id, 'chess.board')
    renderAt('/', repos)
    const switcher = await screen.findByRole('radiogroup', { name: 'Courses' })
    expect(within(switcher).getAllByRole('radio')).toHaveLength(3)
    await userEvent.click(within(switcher).getByRole('radio', { name: 'Spanish' }))
    expect(await screen.findByTestId('spanish-home')).toBeInTheDocument()
    expect((await repos.profiles.list())[0]).toMatchObject({
      courses: ['math', 'chess', 'spanish'],
      currentCourse: 'spanish',
    })
    expect((await repos.progress.forProfile(id))['chess.board']?.crowned).toBe(true)
    // Open play: crystals and level only.
    expect(await screen.findByTestId('stat-gems')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-goal')).toBeNull()
  })

  it('rests at the optional Spanish limit (AC6), and math stays open', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'spanish'], 'spanish')
    const settings = await repos.time.settings(id)
    await repos.time.setSettings(id, { ...settings, spanishLimitMin: 15 })
    await repos.time.addSpanish(id, 15 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('spanish-rest')).toHaveTextContent('¡Hasta mañana!')
    await userEvent.click(screen.getByRole('radio', { name: 'Math' }))
    expect(await screen.findByTestId('journey')).toBeInTheDocument()
  })
})

describe('Grown-ups: Spanish voice and limit (spec 018 AC5, AC6)', () => {
  it('lists only Spanish voices, Latin American first, and plays the sample', async () => {
    voices = [
      { name: 'Aria', lang: 'en-US', voiceURI: 'aria', localService: true },
      { name: 'Helena', lang: 'es-ES', voiceURI: 'helena', localService: true },
      { name: 'Paulina', lang: 'es-MX', voiceURI: 'paulina', localService: true },
    ]
    const { repos } = testStore()
    await renderGrownUp('/grown-ups', repos)
    const picker = await screen.findByRole('combobox', { name: 'Spanish voice' })
    const options = within(picker)
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toEqual([
      'Best on this device: Paulina · es-MX',
      'Paulina · es-MX',
      'Helena · es-ES',
    ])
    await userEvent.selectOptions(picker, 'helena')
    await waitFor(async () =>
      expect(await repos.device.audio()).toMatchObject({ spanishVoiceURI: 'helena' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Test Spanish voice' }))
    expect(speak).toHaveBeenCalledWith(
      'Hola, soy Kukoos. ¡Vamos a aprender español!',
      expect.objectContaining({ lang: 'es', voiceURI: 'helena' }),
    )
  })

  it('explains how to add a Spanish voice when there is none', async () => {
    voices = [{ name: 'Aria', lang: 'en-US', voiceURI: 'aria', localService: true }]
    const { repos } = testStore()
    await renderGrownUp('/grown-ups', repos)
    expect(await screen.findByTestId('no-spanish-voice')).toHaveTextContent('no Spanish voice')
    expect(screen.queryByRole('combobox', { name: 'Spanish voice' })).toBeNull()
  })

  it('the Spanish limit is off by default and saves per kid', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['spanish'])
    await renderGrownUp('/grown-ups', repos)
    const limit = await screen.findByRole('combobox', { name: 'Spanish daily limit' })
    expect(limit).toHaveValue('off')
    await userEvent.selectOptions(limit, '20')
    await waitFor(async () =>
      expect(await repos.time.settings(id)).toMatchObject({
        spanishLimitMin: 20,
        chessLimitMin: null,
      }),
    )
  })

  it('no Spanish settings without the gate', async () => {
    vi.stubEnv('VITE_SPANISH', '')
    const { repos } = testStore()
    await renderGrownUp('/grown-ups', repos)
    expect(await screen.findByRole('combobox', { name: 'Chess daily limit' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Spanish daily limit' })).toBeNull()
    expect(screen.queryByTestId('no-spanish-voice')).toBeNull()
  })
})
