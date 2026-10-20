import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from '@/audio/tts'
import type { Repositories } from '@/data'
import type { CourseId } from '@/domain'
import { testStore } from '../withData'
import { renderAt, renderGrownUp } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

beforeEach(() => {
  vi.mocked(speak).mockClear()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

async function kid(repos: Repositories, courses: CourseId[], currentCourse?: CourseId) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, currentCourse ? { courses, currentCourse } : { courses })
  return id
}

describe('course homes and the switcher (spec 013 AC3, AC4, AC6)', () => {
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
    expect(await screen.findByTestId('stat-goal')).toBeInTheDocument()

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

describe('choosing courses (spec 013 AC5, AC7)', () => {
  it('first run asks what to learn; chess only means no math map', async () => {
    const { repos } = testStore({ onboarded: false })
    renderAt('/', repos)
    expect(await screen.findByText("Hi! I'm Kukoos. Let's learn and play together!")).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: "Let's go!" }))
    expect(screen.getByText('What do you want to learn?')).toBeVisible()
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Chess' }))
    expect(screen.getByRole('button', { name: 'Chess' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(next)
    await userEvent.click(screen.getByRole('button', { name: 'Comet' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: "That's me!" }))

    expect(await screen.findByTestId('chess-home')).toBeInTheDocument()
    expect(screen.queryByTestId('journey')).toBeNull()
    expect((await repos.profiles.list())[0]).toMatchObject({
      courses: ['chess'],
      currentCourse: 'chess',
    })
  })

  it('Me → My courses adds and drops courses without a PIN, never the last one', async () => {
    const { repos } = testStore()
    await kid(repos, ['chess'])
    renderAt('/me', repos)
    const math = await screen.findByRole('button', { name: 'Math' })
    expect(math).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Chess' }))
    expect(speak).toHaveBeenCalledWith('You need at least one course.')
    expect((await repos.profiles.list())[0]?.courses).toEqual(['chess'])

    await userEvent.click(math)
    await waitFor(async () =>
      expect((await repos.profiles.list())[0]?.courses).toEqual(['math', 'chess']),
    )
    // Dropping the current course switches home to the one left.
    await userEvent.click(await screen.findByRole('button', { name: 'Chess', pressed: true }))
    await waitFor(async () =>
      expect((await repos.profiles.list())[0]).toMatchObject({
        courses: ['math'],
        currentCourse: 'math',
      }),
    )
  })

  it('grown-ups get the optional chess limit, off by default', async () => {
    const { repos } = testStore()
    const id = await kid(repos, ['math', 'chess'])
    await renderGrownUp('/grown-ups', repos)
    const section = await screen.findByRole('region', { name: 'Daily time' })
    expect(section).toHaveTextContent('Math daily time')
    const chessLimit = screen.getByRole('combobox', { name: 'Chess daily limit' })
    expect(chessLimit).toHaveValue('off')
    await userEvent.selectOptions(chessLimit, '30')
    await waitFor(async () =>
      expect(await repos.time.settings(id)).toMatchObject({ chessLimitMin: 30 }),
    )
  })
})
