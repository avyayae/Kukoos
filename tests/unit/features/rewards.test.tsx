import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  type RewardEffect,
  startLesson,
} from '@/domain'
import { LessonComplete } from '@/features/lesson-player/LessonComplete'
import { momentFor } from '@/features/rewards/copy'
import { withData } from '../withData'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
}))

function finished(): LessonState {
  let s = startLesson({ skillId: 'add.within20', seed: 7, at: 0 })
  while (s.phase !== 'complete') {
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
    s = lessonReducer(s, { type: 'continue', at: 60_000 })
  }
  return s
}

const EFFECTS: RewardEffect[] = [
  { type: 'xpGained', amount: 18, total: 18 },
  { type: 'chestOpened', gems: 5 },
  { type: 'gemsGained', amount: 20, total: 20 },
  { type: 'badgeUnlocked', badgeId: 'first-flight' },
  { type: 'levelUp', level: 2 },
  { type: 'goalMet', minutes: 10 },
  { type: 'streakExtended', count: 3, milestone: true },
  { type: 'freezeEarned', freezes: 1 },
]

/** The screen-reader text of a count-up (its final value). */
const finals = (text: string) =>
  screen.getAllByTestId('count-final').find((el) => el.textContent === text) ?? null

const cont = () => userEvent.click(screen.getByRole('button', { name: 'Continue' }))

describe('celebration orchestrator (AC10)', () => {
  it('shows XP and crystals on the summary, then one moment at a time, in order', async () => {
    const onContinue = vi.fn()
    render(
      withData(
        <LessonComplete
          state={finished()}
          effects={EFFECTS}
          autoRead={false}
          onContinue={onContinue}
        />,
      ),
    )
    const earned = screen.getByTestId('earned')
    expect(earned).toHaveTextContent('XP')
    expect(finals('+18')).toBeInTheDocument()
    expect(finals('+20')).toBeInTheDocument()

    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      await cont()
      const moment = screen.getByTestId('reward-moment')
      seen.push(moment.getAttribute('data-effect') ?? '')
      expect(moment).toHaveAttribute('data-sound')
    }
    expect(seen).toEqual([
      'chestOpened',
      'badgeUnlocked',
      'levelUp',
      'goalMet',
      'streakExtended',
      'freezeEarned',
    ])
    expect(screen.getByRole('heading', { name: 'Streak freeze earned!' })).toBeInTheDocument()
    expect(onContinue).not.toHaveBeenCalled()
    await cont()
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('without moments, CONTINUE leaves right away; it waits while rewards are saving', async () => {
    const onContinue = vi.fn()
    const { rerender } = render(
      withData(
        <LessonComplete
          state={finished()}
          effects={null}
          autoRead={false}
          onContinue={onContinue}
        />,
      ),
    )
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    rerender(
      withData(
        <LessonComplete
          state={finished()}
          effects={[{ type: 'xpGained', amount: 11, total: 11 }]}
          autoRead={false}
          onContinue={onContinue}
        />,
      ),
    )
    await cont()
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('every effect has kid copy (or is shown on the summary)', () => {
    expect(momentFor({ type: 'xpGained', amount: 1, total: 1 })).toBeNull()
    expect(momentFor({ type: 'gemsGained', amount: 1, total: 1 })).toBeNull()
    expect(momentFor({ type: 'badgeUnlocked', badgeId: 'nope' })).toBeNull()
    expect(momentFor({ type: 'streakFrozen', used: 1 })?.title).toBe('Kukoos kept your flame warm!')
    expect(momentFor({ type: 'streakExtended', count: 1, milestone: false })?.title).toBe(
      '1 day flame!',
    )
    for (const e of EFFECTS.slice(1)) {
      const copy = momentFor(e)
      if (!copy) continue
      expect(`${copy.title} ${copy.body}`).not.toMatch(/wrong|fail|lost|lose/i)
    }
  })

  it('reduced motion shows the final numbers', async () => {
    const mql = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList)
    render(
      withData(
        <LessonComplete
          state={finished()}
          effects={EFFECTS}
          autoRead={false}
          onContinue={vi.fn()}
        />,
      ),
    )
    // The visible (animated) digits show the final number straight away.
    await waitFor(() => expect(finals('+18')?.nextSibling).toHaveTextContent('+18'))
    spy.mockRestore()
  })
})
