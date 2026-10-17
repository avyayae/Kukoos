import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Activity, useActivity, useDailyTime } from '@/app/time'
import { TimeProvider } from '@/app/TimeProvider'
import { createNullRepositories, DataProvider, type Repositories } from '@/data'
import { ReadAloudProvider } from '@/ui'

vi.mock('@/audio/tts', () => ({ speak: vi.fn(), cancelSpeech: vi.fn() }))

let visibility: DocumentVisibilityState = 'visible'
let clock = 0

function Probe({ activity }: { activity: Activity | null }) {
  useActivity(activity)
  const { today, budget, ready } = useDailyTime()
  if (!ready) return null
  return (
    <p data-testid="probe">
      {today?.lessonSeconds ?? 0}/{today?.totalSeconds ?? 0}/{budget.locked ? 'locked' : 'open'}
    </p>
  )
}

async function setup(
  activity: Activity | null,
  repos: Repositories = createNullRepositories(() => clock),
) {
  const ui = (a: Activity | null) => (
    <DataProvider repos={repos}>
      <ReadAloudProvider>
        <TimeProvider now={() => clock}>
          <Probe activity={a} />
        </TimeProvider>
      </ReadAloudProvider>
    </DataProvider>
  )
  const view = render(ui(activity))
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
  return { ...view, repos, rerenderWith: (a: Activity | null) => view.rerender(ui(a)) }
}

/** Moves the fake clock and timers forward together. */
async function pass(ms: number, { input = true } = {}) {
  for (let t = 0; t < ms; t += 5000) {
    if (input) window.dispatchEvent(new Event('pointerdown'))
    clock += 5000
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  clock = new Date(2026, 9, 17, 18, 0).getTime()
  visibility = 'visible'
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('active-time tracker (AC6)', () => {
  it('lesson time counts toward the goal and the limit', async () => {
    await setup('lesson')
    await pass(15_000)
    expect(screen.getByTestId('probe').textContent).toBe('15/15/open')
  })

  it('map time counts only toward the limit', async () => {
    await setup('map')
    await pass(10_000)
    expect(screen.getByTestId('probe').textContent).toBe('0/10/open')
  })

  it('nothing counts while hidden, idle for 60s, or with no activity', async () => {
    const { rerenderWith } = await setup('lesson')
    visibility = 'hidden'
    await pass(10_000)
    expect(screen.getByTestId('probe').textContent).toBe('0/0/open')

    visibility = 'visible'
    await pass(65_000, { input: false })
    // The last input was 10s before these ticks: 50s still count, then the kid is idle.
    expect(screen.getByTestId('probe').textContent).toBe('50/50/open')

    rerenderWith(null)
    await pass(10_000)
    expect(screen.getByTestId('probe').textContent).toBe('50/50/open')
  })

  it('locks when the limit is reached', async () => {
    const repos = createNullRepositories(() => clock)
    await repos.time.setSettings('local', { goalMin: 5, limitMin: 15 })
    await repos.time.addActive('local', 0, 15 * 60 - 5)
    await setup('map', repos)
    expect(screen.getByTestId('probe').textContent).toContain('open')
    await pass(5000)
    expect(screen.getByTestId('probe').textContent).toContain('locked')
  })

  it('shows the 2-minute heads-up once, then hides it', async () => {
    const repos = createNullRepositories(() => clock)
    await repos.time.addActive('local', 0, 60 * 60 - 125)
    await setup('map', repos)
    expect(screen.queryByTestId('heads-up')).toBeNull()
    await pass(5000)
    expect(screen.getByTestId('heads-up').textContent).toContain('2 more minutes')
    await pass(5000)
    expect(screen.queryByTestId('heads-up')).toBeNull()
    await pass(10_000)
    expect(screen.queryByTestId('heads-up')).toBeNull()
  })

  it('starts a fresh day at midnight', async () => {
    clock = new Date(2026, 9, 17, 23, 59, 50).getTime()
    await setup('lesson')
    await pass(5000)
    expect(screen.getByTestId('probe').textContent).toBe('5/5/open')
    await pass(10_000)
    // One tick switches to the new day, the next one counts on it.
    expect(screen.getByTestId('probe').textContent).toBe('5/5/open')
  })
})
