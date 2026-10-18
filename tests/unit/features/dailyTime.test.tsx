import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from '@/audio/tts'
import type { Repositories } from '@/data'
import { addDays, correctResponse, lessonReducer, localDate, startLesson } from '@/domain'
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

async function profileId(repos: Repositories) {
  return (await repos.profiles.ensureCurrent())?.id ?? ''
}

async function savePerfectLesson(repos: Repositories) {
  let s = startLesson({ skillId: 'add.within20', seed: 7, at: Date.now() })
  while (s.phase !== 'complete') {
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: Date.now() })
    s = lessonReducer(s, { type: 'continue', at: Date.now() })
  }
  await repos.lessons.save(s, { lessonId: 'L1', profileId: await profileId(repos) })
}

describe('map header stats (AC11)', () => {
  it('shows streak, crystals, goal ring and level, each tap-to-hear', async () => {
    const { repos } = testStore()
    await savePerfectLesson(repos)
    await repos.time.addActive(await profileId(repos), 240, 300)
    renderAt('/', repos)
    const gems = await screen.findByTestId('stat-gems')
    expect(gems).toHaveAccessibleName('20 star crystals')
    expect(screen.getByTestId('stat-streak')).toHaveAccessibleName(
      'Meet your daily goal to light your flame!',
    )
    await waitFor(() =>
      expect(screen.getByTestId('stat-goal')).toHaveAccessibleName('Daily goal: 4 of 10 minutes'),
    )
    expect(screen.getByTestId('stat-level')).toHaveAccessibleName(/^Level 1\. \d+ XP to level 2\.$/)
    await userEvent.click(gems)
    expect(speak).toHaveBeenCalledWith('20 star crystals')
  })

  it.each([
    ['a freeze covers one missed day', -2, 'Kukoos kept your flame warm!'],
    ['too many missed days start a new flame', -5, "Let's start a new flame today!"],
  ])('%s: told gently on the map', async (_, daysAgo, text) => {
    const { db, repos } = testStore()
    const id = await profileId(repos)
    await db.wallet.put({
      id,
      profileId: id,
      updatedAt: 0,
      version: 1,
      xpTotal: 0,
      level: 1,
      gems: 0,
      streakCount: 4,
      streakFreezes: 1,
      lastGoalMetDate: addDays(localDate(Date.now()), daysAgo),
    })
    renderAt('/', repos)
    expect(await screen.findByTestId('streak-notice')).toHaveTextContent(text)
  })
})

describe('trophy room', () => {
  it('earned badges in color, the rest "Not yet" with how to earn them', async () => {
    const { repos } = testStore()
    await savePerfectLesson(repos)
    renderAt('/trophies', repos)
    const first = await screen.findByTestId('badge-first-flight')
    await waitFor(() => expect(first).toHaveAttribute('data-earned', 'true'))
    const zero = screen.getByTestId('badge-zero-hero')
    expect(zero).toHaveAttribute('data-earned', 'false')
    expect(zero).toHaveTextContent('Not yet')
    await userEvent.click(zero)
    expect(speak).toHaveBeenCalledWith('Not yet. Get a crown in taking away across a zero.')
  })

  it('opens from the bottom bar', async () => {
    const { repos } = testStore()
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Trophies' }))
    expect(router.state.location.pathname).toBe('/trophies')
  })
})

describe('daily limit (AC8)', () => {
  it('at the limit, the map and new lessons show Goodnight', async () => {
    const { repos } = testStore()
    await repos.time.addActive(await profileId(repos), 0, 60 * 60)
    renderAt('/', repos)
    expect(await screen.findByTestId('goodnight')).toHaveTextContent('Great job today!')
    expect(screen.queryByRole('button', { name: /Play/ })).toBeNull()
  })

  it('a lesson opened at the limit shows Goodnight instead', async () => {
    const { repos } = testStore()
    await repos.time.addActive(await profileId(repos), 0, 60 * 60)
    renderAt('/lesson/add.within20?seed=1', repos)
    expect(await screen.findByTestId('goodnight')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
  })

  it('a running lesson keeps going when the limit is reached', async () => {
    const { repos } = testStore()
    await repos.time.addActive(await profileId(repos), 0, 60 * 60 - 5)
    const router = renderAt('/lesson/add.within20?seed=1', repos)
    await screen.findByRole('button', { name: 'Check' })
    // One 5s tick reaches the limit.
    await waitFor(
      async () => expect((await repos.time.today(await profileId(repos))).totalSeconds).toBe(3600),
      { timeout: 8000 },
    )
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
    expect(screen.queryByTestId('goodnight')).toBeNull()
    await router.navigate('/')
    expect(await screen.findByTestId('goodnight')).toBeInTheDocument()
  }, 15_000)
})

describe('grown-ups daily time (AC12)', () => {
  it('sets goal and limit, and +10 minutes opens play again', async () => {
    const { repos } = testStore()
    const id = await profileId(repos)
    await repos.time.addActive(id, 120, 60 * 60)
    await renderGrownUp('/grown-ups', repos)
    await waitFor(() =>
      expect(screen.getByTestId('today-minutes')).toHaveTextContent(
        'Today: 2 min in missions, 60 min in the app. The daily limit is reached.',
      ),
    )
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Daily goal' }), '15')
    await waitFor(async () => expect((await repos.time.settings(id)).goalMin).toBe(15))

    await userEvent.click(screen.getByRole('button', { name: '+10 minutes today' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Added 10 minutes for today.'),
    )
    await waitFor(() =>
      expect(screen.getByTestId('today-minutes')).toHaveTextContent('10 min left.'),
    )
    expect((await repos.time.today(id)).bonusMinutes).toBe(10)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Daily limit' }), 'off')
    await waitFor(async () => expect((await repos.time.settings(id)).limitMin).toBeNull())
    expect(screen.getByRole('button', { name: '+10 minutes today' })).toBeDisabled()
  })
})
