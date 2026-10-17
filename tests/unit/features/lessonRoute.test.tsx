import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import type { Repositories } from '@/data'
import { DAY_MS } from '@/domain'
import { testStore, withData } from '../withData'

const renderAt = (path: string, repos: Repositories) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(withData(<RouterProvider router={router} />, repos))
  return router
}

describe('lesson route composes from progress (T6)', () => {
  it('a new skill starts with trade blocks', async () => {
    const { repos } = testStore()
    renderAt('/lesson/sub.within100.regroup?seed=3', repos)
    expect(await screen.findByTestId('blocks')).toBeInTheDocument()
  })

  it('a solid skill skips blocks and guided columns', async () => {
    const { db, repos } = testStore()
    const profile = await repos.profiles.ensureCurrent()
    const pid = profile?.id ?? ''
    await db.skillProgress.put({
      id: `${pid}:sub.within100.regroup`,
      profileId: pid,
      skillId: 'sub.within100.regroup',
      mastery: 0.75,
      attempts: 20,
      sessionsSeen: 2,
      srsBox: 1,
      nextReviewAt: 0,
      crowned: false,
      preMastered: false,
      updatedAt: 1,
      version: 1,
    })
    renderAt('/lesson/sub.within100.regroup?seed=3', repos)
    expect(await screen.findByRole('button', { name: 'Check' })).toBeInTheDocument()
    expect(screen.queryByTestId('blocks')).toBeNull()
  })
})

describe('Review mission route (AC5)', () => {
  it('says there is nothing to review when nothing is due', async () => {
    const { repos } = testStore()
    renderAt('/lesson/review', repos)
    expect(await screen.findByRole('heading', { name: /Nothing to review/ })).toBeInTheDocument()
  })

  it('plays due reviews (test clock moved past the review date)', async () => {
    const { repos } = testStore()
    const profile = await repos.profiles.ensureCurrent()
    await repos.progress.applyStartingPoint(profile?.id ?? '', 'pv.tradeTens')
    const later = Date.now() + 5 * DAY_MS
    renderAt(`/lesson/review?seed=1&now=${later}`, repos)
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument()
  })
})
