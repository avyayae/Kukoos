import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import hints from '../../../content/hints.en.json'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  simulateBugs,
  startLesson,
  wrongResponse,
} from '@/domain'
import { LessonScreen } from '@/features/lesson-player/LessonScreen'
import { withData } from '../withData'
import { answerInUi } from './lessonUi'

const SKILL = 'sub.within100.regroup'
const SEED = 42

function setup() {
  const onExit = vi.fn()
  render(withData(<LessonScreen skillId={SKILL} seed={SEED} onExit={onExit} now={() => 0} />))
  // Mirror of the session to know which question is on screen.
  let mirror: LessonState = startLesson({ skillId: SKILL, seed: SEED, at: 0 })
  const step = (event: Parameters<typeof lessonReducer>[1]) => {
    mirror = lessonReducer(mirror, event)
  }
  return {
    onExit,
    get mirror() {
      return mirror
    },
    step,
  }
}

const check = () => userEvent.click(screen.getByRole('button', { name: 'Check' }))

describe('LessonScreen: correct flow (AC4)', () => {
  it('CHECK is disabled until answered; praise banner; CONTINUE advances progress', async () => {
    const s = setup()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    await answerInUi(s.mirror.question, correctResponse(s.mirror.question))
    await check()
    const banner = screen.getByTestId('feedback')
    expect(hints.lists['praise:savanna']).toContain(
      within(banner).getByRole('heading').textContent?.replace('✓', ''),
    )
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement()
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()

    await userEvent.click(within(banner).getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
    expect(screen.queryByTestId('feedback')).toBeNull()
  })
})

describe('LessonScreen: not-yet flow (AC5)', () => {
  it('shows the targeted hint with the kid’s numbers, SHOW ME, and a clean retry', async () => {
    const s = setup()
    const q = s.mirror.question
    const m = q.arithmetic as NonNullable<typeof q.arithmetic>
    const bug = simulateBugs(m.a, m.b, m.op)['sub.smallerFromLarger'] as number
    await answerInUi(q, wrongResponse(q, bug))
    await check()

    const banner = screen.getByTestId('feedback')
    expect(hints.lists.notYet).toContain(
      within(banner).getByRole('heading').textContent?.replace('↺', ''),
    )
    expect(banner).toHaveTextContent(/Can we take \d from \d\? Trade a ten first!/)
    expect(document.body.textContent).not.toMatch(/wrong|incorrect|fail/i)

    await userEvent.click(within(banner).getByRole('button', { name: 'Show me' }))
    const dialog = screen.getByRole('dialog', { name: 'Show me' })
    expect(within(dialog).getByTestId('visual-hint')).toHaveTextContent(`${m.a} is`)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }))

    await userEvent.click(within(banner).getByRole('button', { name: 'Try again' }))
    expect(screen.queryByTestId('feedback')).toBeNull()
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('LessonScreen: second miss (AC6)', () => {
  it('shows the worked solution, then moves on', async () => {
    const s = setup()
    const q = s.mirror.question
    await answerInUi(q, wrongResponse(q))
    await check()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await answerInUi(q, wrongResponse(q))
    await check()

    const banner = screen.getByTestId('feedback')
    expect(banner).toHaveTextContent("Let's look together")
    expect(banner).toHaveTextContent(`The answer is ${q.answer.value}.`)
    expect(within(banner).getByTestId('worked-steps')).toHaveTextContent(/traded a ten/)
    await userEvent.click(within(banner).getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '9')
  })
})

describe('LessonScreen: whole lesson + complete (AC10)', () => {
  it('plays all 10 questions and shows the summary', async () => {
    const s = setup()
    for (let i = 0; i < 10; i++) {
      const q = s.mirror.question
      const r = correctResponse(q)
      await answerInUi(q, r)
      await check()
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
      s.step({ type: 'answer', response: r, at: 0 })
      s.step({ type: 'continue', at: 0 })
    }
    expect(screen.getByRole('heading', { name: 'Mission complete!' })).toBeInTheDocument()
    const stats = screen.getByRole('list', { name: 'Lesson results' })
    expect(stats).toHaveTextContent('100%')
    expect(stats).toHaveTextContent('<1')
    expect(stats).toHaveTextContent('10')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(s.onExit).toHaveBeenCalledOnce()
  }, 30_000)
})

describe('LessonScreen: exit and settings (AC11, AC9)', () => {
  it('asks before leaving', async () => {
    const s = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    expect(screen.getByRole('dialog', { name: 'Leave this mission?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(s.onExit).toHaveBeenCalledOnce()
  })

  it('toggles reading aloud', async () => {
    setup()
    const toggle = screen.getByRole('button', { name: 'Turn off reading aloud' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Turn on reading aloud' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})

describe('LessonScreen: keyboard play (AC12)', () => {
  it('digits + Enter checks (and stays on the feedback), Enter again continues', async () => {
    const s = setup()
    const q = s.mirror.question
    // First question is a tradeBlocks question: type the number on the physical keyboard.
    await userEvent.keyboard(String(q.answer.value))
    await userEvent.keyboard('{Enter}')
    // Regression: one Enter press must not also click the newly focused CONTINUE.
    expect(screen.getByTestId('feedback')).toHaveClass('banner--correct')
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByTestId('feedback')).toBeNull()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
  })
})
