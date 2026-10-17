import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { correctResponse, type LessonState, lessonReducer, startLesson } from '@/domain'
import { LessonScreen } from '@/features/lesson-player/LessonScreen'
import { testStore, withData } from '../withData'
import { answerInUi } from './lessonUi'

const SKILL = 'add.within20'
const SEED = 7
const check = () => userEvent.click(screen.getByRole('button', { name: 'Check' }))

async function answerCorrectly(mirror: LessonState): Promise<LessonState> {
  const r = correctResponse(mirror.question)
  await answerInUi(mirror.question, r)
  await check()
  return lessonReducer(mirror, { type: 'answer', response: r, at: 0 })
}

describe('saving lessons from the UI (AC3, AC4)', () => {
  it('saves a completed lesson once it ends', async () => {
    const { db, repos } = testStore()
    render(withData(<LessonScreen skillId={SKILL} seed={SEED} onExit={vi.fn()} />, repos))
    let mirror = startLesson({ skillId: SKILL, seed: SEED, at: 0 })
    while (mirror.phase !== 'complete') {
      mirror = await answerCorrectly(mirror)
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
      mirror = lessonReducer(mirror, { type: 'continue', at: 0 })
    }
    expect(screen.getByRole('heading', { name: 'Mission complete!' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.lessons.count()).toBe(1))
    expect((await db.lessons.toArray())[0]).toMatchObject({
      skillId: SKILL,
      completed: true,
      questionCount: 10,
      firstTryCorrect: 10,
    })
    expect(await db.attempts.count()).toBe(10)
  }, 30_000)

  it('saves an early exit as incomplete', async () => {
    const { db, repos } = testStore()
    const onExit = vi.fn()
    render(withData(<LessonScreen skillId={SKILL} seed={SEED} onExit={onExit} />, repos))
    let mirror = startLesson({ skillId: SKILL, seed: SEED, at: 0 })
    // Wait for the profile before answering, as a kid naturally would.
    await waitFor(async () => expect(await db.profiles.count()).toBe(1))
    mirror = await answerCorrectly(mirror)
    void mirror
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onExit).toHaveBeenCalledOnce()
    await waitFor(async () => expect(await db.lessons.count()).toBe(1))
    expect((await db.lessons.toArray())[0]).toMatchObject({ completed: false, questionCount: 1 })
  })

  it('leaving before answering saves nothing', async () => {
    const { db, repos } = testStore()
    render(withData(<LessonScreen skillId={SKILL} seed={SEED} onExit={vi.fn()} />, repos))
    await waitFor(async () => expect(await db.profiles.count()).toBe(1))
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    await new Promise((r) => setTimeout(r, 50))
    expect(await db.lessons.count()).toBe(0)
  })
})

describe('mission cards show saved progress (AC6)', () => {
  it('shows "New!" for unplayed skills and the best score for played ones', async () => {
    const { repos } = testStore()
    const profile = await repos.profiles.ensureCurrent()
    let s = startLesson({ skillId: SKILL, seed: SEED, at: 0 })
    while (s.phase !== 'complete') {
      s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
      s = lessonReducer(s, { type: 'continue', at: 2 })
    }
    await repos.lessons.save(s, { lessonId: 'L1', profileId: profile?.id ?? '' })

    const router = createMemoryRouter(routes, { initialEntries: ['/practice'] })
    render(withData(<RouterProvider router={router} />, repos))
    const card = screen.getByRole('link', { name: /Add within 20/ })
    await waitFor(() => expect(card).toHaveTextContent('⭐ 100%'))
    expect(screen.getByRole('link', { name: /Subtract within 20/ })).toHaveTextContent('New!')
    await userEvent.click(screen.getByRole('link', { name: /For grown-ups/ }))
    expect(router.state.location.pathname).toBe('/grown-ups')
  })
})
