import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

async function preMasterJungle(repos: Repositories) {
  const profile = await repos.profiles.ensureCurrent()
  await repos.progress.applyStartingPoint(profile?.id ?? '', 'pv.tradeTens')
}

describe('picker: crowns and review (AC9)', () => {
  it('shows 👑 on crowned skills and no review card when nothing is due', async () => {
    const { repos } = testStore()
    await preMasterJungle(repos)
    renderAt('/practice', repos)
    const card = screen.getByRole('link', { name: /Add within 20/ })
    await waitFor(() =>
      expect(within(card).getByRole('img', { name: 'Mastered' })).toBeInTheDocument(),
    )
    expect(
      within(screen.getByRole('link', { name: /Trade a ten for ones/ })).getByText('New!'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('review-card')).toBeNull()
  })

  it('shows "Review (N)" when reviews are due and opens the Review mission', async () => {
    const { repos } = testStore()
    await preMasterJungle(repos)
    const later = Date.now() + 5 * DAY_MS
    const router = renderAt(`/practice?now=${later}`, repos)
    const review = await screen.findByTestId('review-card')
    expect(review).toHaveTextContent('4 skills to practise again')
    await userEvent.click(review)
    expect(router.state.location.pathname).toBe('/lesson/review')
    expect(router.state.location.search).toBe(`?now=${later}`)
    expect(await screen.findByRole('button', { name: 'Check' })).toBeInTheDocument()
  })

  it('a partly-learned skill shows its mastery ring', async () => {
    const { db, repos } = testStore()
    const profile = await repos.profiles.ensureCurrent()
    const pid = profile?.id ?? ''
    await db.skillProgress.put({
      id: `${pid}:add.within20`,
      profileId: pid,
      skillId: 'add.within20',
      mastery: 0.42,
      attempts: 8,
      sessionsSeen: 1,
      srsBox: 1,
      nextReviewAt: 0,
      crowned: false,
      preMastered: false,
      updatedAt: 1,
      version: 1,
    })
    renderAt('/practice', repos)
    const card = screen.getByRole('link', { name: /Add within 20/ })
    await waitFor(() =>
      expect(card.querySelector('.skill-card__ring')?.getAttribute('style')).toContain('--p: 42'),
    )
  })
})

describe('grown-ups: starting point (AC10)', () => {
  it('lists missions in path order and pre-masters earlier ones after confirming', async () => {
    const { db, repos } = testStore()
    renderAt('/grown-ups', repos)
    const select = await screen.findByRole('combobox', { name: 'Start at' })
    const options = within(select)
      .getAllByRole('option')
      .slice(1)
      .map((o) => o.textContent)
    expect(options.slice(0, 5)).toEqual([
      'Add within 20',
      'Subtract within 20',
      'Add 2-digit numbers',
      'Subtract 2-digit numbers',
      'Trade a ten for ones',
    ])
    await waitFor(() => expect(select).toBeEnabled())
    await userEvent.selectOptions(select, 'pv.tradeTens')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Set starting point' })).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Set starting point' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, mark as known' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4 missions are marked as known'),
    )
    expect((await db.skillProgress.toArray()).every((r) => r.crowned && r.preMastered)).toBe(true)
  })

  it('the first mission has nothing before it', async () => {
    const { repos } = testStore()
    renderAt('/grown-ups', repos)
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Start at' }),
      'add.within20',
    )
    expect(screen.getByRole('button', { name: 'This is the very first mission' })).toBeDisabled()
  })

  it('/backup redirects to /grown-ups', async () => {
    const { repos } = testStore()
    const router = renderAt('/backup', repos)
    expect(await screen.findByRole('heading', { name: 'Grown-ups' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/grown-ups')
  })
})
