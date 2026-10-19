import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from '@/audio/tts'
import type { Repositories } from '@/data'
import type { CourseId } from '@/domain'
import { testStore } from '../withData'
import { renderAt } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

beforeEach(() => {
  vi.mocked(speak).mockClear()
  vi.stubEnv('VITE_CHESS', '1')
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})
afterEach(() => {
  vi.unstubAllEnvs()
})

async function kid(repos: Repositories, courses: CourseId[], currentCourse?: CourseId) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, currentCourse ? { courses, currentCourse } : { courses })
  return id
}

describe('course homes and the switcher (spec 013 AC3, AC4, AC6)', () => {
  it('without chess in the build, the map has no switcher (AC8)', async () => {
    vi.stubEnv('VITE_CHESS', '')
    const { repos } = testStore()
    await kid(repos, ['math', 'chess'], 'chess')
    renderAt('/', repos)
    expect(await screen.findByTestId('journey')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Courses' })).toBeNull()
  })

  it('a math-only kid has no switcher', async () => {
    const { repos } = testStore()
    renderAt('/', repos)
    expect(await screen.findByTestId('journey')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup', { name: 'Courses' })).toBeNull()
  })

  it('switches between math and chess, and remembers the course', async () => {
    const { repos } = testStore()
    await kid(repos, ['math', 'chess'])
    renderAt('/', repos)
    const math = await screen.findByRole('radio', { name: 'Math' })
    expect(math).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('stat-goal')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Chess' }))
    expect(await screen.findByTestId('chess-home')).toBeInTheDocument()
    expect(speak).toHaveBeenCalledWith('Chess')
    expect(screen.getByRole('radio', { name: 'Chess' })).toHaveAttribute('aria-checked', 'true')
    // Chess is open play: crystals and level only, no streak or goal ring (AC4).
    expect(await screen.findByTestId('stat-gems')).toBeInTheDocument()
    expect(screen.getByTestId('stat-level')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-goal')).toBeNull()
    expect(screen.queryByTestId('stat-streak')).toBeNull()

    const saved = (await repos.profiles.list())[0]
    expect(saved?.currentCourse).toBe('chess')
  })

  it('a chess-only kid never sees the math map', async () => {
    const { repos } = testStore()
    await kid(repos, ['chess'])
    renderAt('/', repos)
    expect(await screen.findByTestId('chess-home')).toBeInTheDocument()
    expect(screen.queryByTestId('journey')).toBeNull()
    expect(screen.queryByRole('radiogroup', { name: 'Courses' })).toBeNull()
  })

  it('at the math limit, Goodnight offers chess, and chess opens (AC3)', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess'])
    await repos.time.addActive(id, 0, 60 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('goodnight')).toHaveTextContent(
      'Math is sleeping. Want to play chess?',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Play chess' }))
    expect(await screen.findByTestId('chess-home')).toBeInTheDocument()
  })

  it('a math-only kid at the limit sees today’s Goodnight', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math'])
    await repos.time.addActive(id, 0, 60 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('goodnight')).toHaveTextContent('See you tomorrow!')
    expect(screen.queryByRole('button', { name: 'Play chess' })).toBeNull()
  })

  it('the optional chess limit rests chess; math is unaffected', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess'], 'chess')
    await repos.time.setSettings(id, { goalMin: 10, limitMin: 60, chessLimitMin: 15 })
    await repos.time.addChess(id, 15 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('chess-rest')).toHaveTextContent('resting until tomorrow')
    await userEvent.click(screen.getByRole('radio', { name: 'Math' }))
    await waitFor(() => expect(screen.getByTestId('journey')).toBeInTheDocument())
  })
})
