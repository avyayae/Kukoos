import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { configureSfx } from '@/audio/sfx'
import { correctResponse, startLesson, wrongResponse } from '@/domain'
import { LessonScreen } from '@/features/lesson-player/LessonScreen'
import { RewardMoment } from '@/features/rewards/RewardMoment'
import { Goodnight } from '@/features/rewards/Goodnight'
import { withData } from '../withData'
import { answerInUi } from './lessonUi'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
}))

beforeEach(() => {
  window.__kukoosSfx = []
  configureSfx({ on: true, volume: 0.8 })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

const played = () => window.__kukoosSfx ?? []

describe('sounds in the app (AC6)', () => {
  it('a correct answer dings once; a miss boops softly; keypad taps tick', async () => {
    const q = startLesson({ skillId: 'add.within20', seed: 7, at: 0 }).question
    render(
      withData(<LessonScreen skillId="add.within20" seed={7} onExit={vi.fn()} now={() => 0} />),
    )
    await answerInUi(q, wrongResponse(q))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(played()).toContain('notYet')
    expect(played()).toContain('tap')

    await userEvent.click(
      within(screen.getByTestId('feedback')).getByRole('button', { name: 'Try again' }),
    )
    window.__kukoosSfx = []
    await answerInUi(q, correctResponse(q))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(played().filter((s) => s === 'correct')).toHaveLength(1)
    expect(played()).not.toContain('notYet')
  })

  it('reward moments play their own sound; Goodnight plays the lullaby', () => {
    render(
      withData(
        <RewardMoment
          step={1}
          effect={{ type: 'badgeUnlocked', badgeId: 'first-flight' }}
          copy={{ emoji: '🐣', title: 'New badge', body: 'Yay' }}
          autoRead={false}
          onContinue={vi.fn()}
        />,
      ),
    )
    expect(played()).toEqual(['badge'])
    render(
      withData(
        <MemoryRouter>
          <Goodnight minutes={60} />
        </MemoryRouter>,
      ),
    )
    expect(played()).toEqual(['badge', 'lullaby'])
  })

  it('with sound off, nothing plays', async () => {
    configureSfx({ on: false, volume: 0.8 })
    render(
      withData(
        <MemoryRouter>
          <Goodnight minutes={60} />
        </MemoryRouter>,
      ),
    )
    expect(played()).toEqual([])
  })
})
