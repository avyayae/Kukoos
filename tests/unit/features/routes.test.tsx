import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SKILLS, WORLDS } from '@/domain'
import { testStore } from '../withData'
import { passGate, renderAt, renderGrownUp } from './nav'

describe('navigation (spec 007 AC9)', () => {
  it('/ is the map; /practice redirects there', async () => {
    const router = renderAt('/practice')
    expect(await screen.findByTestId('journey')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('unknown routes go to the map', async () => {
    const router = renderAt('/nope')
    expect(await screen.findByTestId('journey')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('leaving a lesson returns to the map', async () => {
    const router = renderAt('/lesson/add.within20?seed=1')
    await userEvent.click(await screen.findByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('an unknown lesson shows a friendly message with a way back', async () => {
    const router = renderAt('/lesson/nope')
    expect(screen.getByRole('heading', { name: /can't find that lesson/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pick a mission' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('seeded lessons still start at the given difficulty', async () => {
    renderAt('/lesson/sub.within100.regroup?seed=42&d=3')
    expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('grown-up gate (AC8)', () => {
  it('a wrong PIN is refused and the gate stays', async () => {
    const { repos } = testStore()
    await repos.device.setPin('2468')
    const router = renderAt('/grown-ups', repos)
    await passGate({ wrong: true })
    expect(await screen.findByText("That's not it. Try again.")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/grown-ups')
    expect(screen.getByRole('heading', { name: 'Enter the grown-up PIN' })).toBeInTheDocument()
  })

  it('the right answer opens Grown-ups, and stays open for the visit', async () => {
    const { repos } = testStore()
    const router = await renderGrownUp('/grown-ups', repos)
    expect(await screen.findByRole('heading', { name: 'Grown-ups' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Show all missions' }))
    expect(router.state.location.pathname).toBe('/grown-ups/missions')
    expect(await screen.findByRole('heading', { name: 'All missions' })).toBeInTheDocument()
  })

  it('all missions lists every skill by world in path order, and opens any lesson', async () => {
    const { repos } = testStore()
    const router = await renderGrownUp('/grown-ups/missions', repos)
    for (const world of WORLDS) {
      const section = await screen.findByRole('region', { name: new RegExp(world.title) })
      const titles = within(section)
        .getAllByRole('link')
        .map((a) => a.querySelector('.skill-card__title')?.textContent)
      expect(titles).toEqual(
        SKILLS.filter((s) => s.worldId === world.id)
          .sort((a, b) => a.order - b.order)
          .map((s) => s.title),
      )
    }
    await userEvent.click(screen.getByRole('link', { name: /Borrow across zero/ }))
    expect(router.state.location.pathname).toBe('/lesson/sub.3digit.acrossZero')
  })
})
