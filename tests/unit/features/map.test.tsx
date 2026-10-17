import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repositories } from '@/data'
import { SKILLS } from '@/domain'
import { testStore } from '../withData'
import { renderAt } from './nav'

let spoken: string[] = []
beforeEach(() => {
  spoken = []
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: (u: { text: string }) => spoken.push(u.text),
      cancel: vi.fn(),
      getVoices: () => [],
    },
    configurable: true,
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    },
    configurable: true,
  })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

async function profileId(repos: Repositories) {
  return (await repos.profiles.ensureCurrent())?.id ?? ''
}

/** Grown-up sets the starting point at Savanna: the jungle becomes pre-mastered. */
async function startAtSavanna(repos: Repositories) {
  await repos.progress.applyStartingPoint(await profileId(repos), 'pv.tradeTens')
}

describe('map: journey and one next step (AC4, AC5)', () => {
  it('fresh kid: 28 nodes in path order, first mission current, Play says it', async () => {
    const { repos } = testStore()
    renderAt('/', repos)
    const journey = await screen.findByTestId('journey')
    const nodes = within(journey).getAllByRole('button')
    expect(nodes).toHaveLength(SKILLS.length + 5)
    expect(nodes[0]).toHaveAccessibleName('Mission 1, Add within 20, play next')
    expect(nodes[1]).toHaveAccessibleName('Mission 2, Subtract within 20, locked')
    expect(screen.getByRole('button', { name: /^Boss challenge, Mars/ })).toBeInTheDocument()
    expect(journey.querySelectorAll('.map-node--current')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Play next: Add within 20' })).toBeInTheDocument()
  })

  it('Play next starts the current mission and says its name', async () => {
    const { repos } = testStore()
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Play next: Add within 20' }))
    expect(router.state.location.pathname).toBe('/lesson/add.within20')
    expect(spoken).toContain('Add within 20')
  })

  it('a starting point moves the current mission to Savanna and crowns the jungle', async () => {
    const { repos } = testStore()
    await startAtSavanna(repos)
    renderAt('/', repos)
    expect(
      await screen.findByRole('button', { name: 'Play next: Trade a ten for ones' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Mission 1, Add within 20, mastered' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Boss challenge, Jungle Warm-up, beaten' }),
    ).toBeInTheDocument()
  })
})

describe('mission sheet + tap-to-hear (AC6, AC7)', () => {
  it('a locked node says which mission comes first and has no Play', async () => {
    const { repos } = testStore()
    renderAt('/', repos)
    await userEvent.click(await screen.findByTestId('node-sub.within20'))
    const sheet = screen.getByRole('dialog', { name: 'Subtract within 20' })
    expect(sheet).toHaveTextContent('Not yet! Finish Add within 20 first.')
    expect(within(sheet).queryByRole('button', { name: 'Play' })).toBeNull()
    expect(spoken.at(-1)).toBe('Subtract within 20. Not yet! Finish Add within 20 first.')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Back to map' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('an open node plays from the sheet', async () => {
    const { repos } = testStore()
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByTestId('node-add.within20'))
    expect(spoken.at(-1)).toBe('Add within 20')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Play' }))
    expect(router.state.location.pathname).toBe('/lesson/add.within20')
  })

  it('bar items speak; Review with nothing due stays put; read-aloud off is silent', async () => {
    const { repos } = testStore()
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Review, nothing due' }))
    expect(spoken.at(-1)).toBe('Nothing to review right now. Great job!')
    expect(router.state.location.pathname).toBe('/')
    await userEvent.click(screen.getByRole('button', { name: 'Turn off reading aloud' }))
    const before = spoken.length
    await userEvent.click(screen.getByTestId('node-add.within20'))
    expect(spoken.length).toBe(before)
  })

  it('Grown-ups in the bar goes to the gate', async () => {
    const { repos } = testStore()
    const router = renderAt('/', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Grown-ups' }))
    expect(router.state.location.pathname).toBe('/grown-ups')
    expect(await screen.findByRole('heading', { name: 'Grown-ups only' })).toBeInTheDocument()
  })
})

describe('boss challenge (AC3 via UI)', () => {
  it('when every jungle skill is earned, the boss is next and plays as a boss lesson', async () => {
    const { db, repos } = testStore()
    const pid = await profileId(repos)
    for (const s of SKILLS.filter((x) => x.worldId === 'jungle')) {
      await db.skillProgress.put({
        id: `${pid}:${s.id}`,
        profileId: pid,
        skillId: s.id,
        mastery: 0.9,
        attempts: 20,
        sessionsSeen: 3,
        srsBox: 3,
        nextReviewAt: Date.now() + 1e9,
        crowned: true,
        preMastered: false,
        updatedAt: 1,
        version: 1,
      })
    }
    const router = renderAt('/', repos)
    const play = await screen.findByRole('button', {
      name: 'Play next: Boss challenge: Jungle Warm-up',
    })
    await userEvent.click(play)
    expect(router.state.location.pathname).toBe('/lesson/boss/jungle')
    expect(await screen.findByRole('button', { name: 'Check' })).toBeInTheDocument()
  })
})

describe('world unlock moment (AC10)', () => {
  it('first visit records open worlds silently; a newly opened world is celebrated once', async () => {
    const first = testStore()
    const pid = await profileId(first.repos)
    renderAt('/', first.repos)
    await screen.findByTestId('journey')
    expect(screen.queryByTestId('world-unlock')).toBeNull()
    await waitFor(async () => expect(await first.repos.journey.seenWorlds(pid)).toEqual(['jungle']))

    await first.repos.progress.applyStartingPoint(pid, 'pv.tradeTens')
    document.body.innerHTML = ''
    renderAt('/', first.repos)
    const moment = await screen.findByTestId('world-unlock')
    expect(moment).toHaveTextContent('Savanna Carry Camp')
    await userEvent.click(moment)
    expect(screen.queryByTestId('world-unlock')).toBeNull()
    await waitFor(async () =>
      expect((await first.repos.journey.seenWorlds(pid)).sort()).toEqual(['jungle', 'savanna']),
    )

    document.body.innerHTML = ''
    renderAt('/', first.repos)
    await screen.findByTestId('journey')
    expect(screen.queryByTestId('world-unlock')).toBeNull()
  })
})
