import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { SKILLS, WORLDS } from '@/domain'
import { withData } from '../withData'

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(withData(<RouterProvider router={router} />))
  return router
}

describe('Practice picker (AC1)', () => {
  it('START on the home screen opens the picker', async () => {
    const router = renderAt('/')
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(router.state.location.pathname).toBe('/practice')
  })

  it('lists all 23 skills grouped by world, in path order', () => {
    renderAt('/practice')
    for (const world of WORLDS) {
      const section = screen.getByRole('region', { name: new RegExp(world.title) })
      const titles = within(section)
        .getAllByRole('link')
        .map((a) => a.querySelector('.skill-card__title')?.textContent)
      const expected = SKILLS.filter((s) => s.worldId === world.id)
        .sort((a, b) => a.order - b.order)
        .map((s) => s.title)
      expect(titles).toEqual(expected)
    }
    expect(
      screen.getAllByRole('link', { name: /./ }).filter((a) => a.classList.contains('skill-card')),
    ).toHaveLength(23)
  })

  it('opens a lesson from a skill card', async () => {
    const router = renderAt('/practice')
    await userEvent.click(screen.getByRole('link', { name: /Subtract with borrowing/ }))
    expect(router.state.location.pathname).toBe('/lesson/sub.within100.regroup')
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})

describe('Lesson route', () => {
  it('shows a friendly not-found screen for unknown skills', async () => {
    const router = renderAt('/lesson/nope')
    expect(screen.getByRole('heading', { name: /can't find that lesson/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pick a mission' }))
    expect(router.state.location.pathname).toBe('/practice')
  })

  it('is reproducible with ?seed', () => {
    renderAt('/lesson/sub.within100.regroup?seed=42&d=3')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('leaving a lesson returns to the picker', async () => {
    const router = renderAt('/lesson/add.within20?seed=1')
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(router.state.location.pathname).toBe('/practice')
  })
})
