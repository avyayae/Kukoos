import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSpeech, speak } from '@/audio/tts'
import { correctResponse, startLesson, wrongResponse } from '@/domain'
import { LessonScreen } from '@/features/lesson-player/LessonScreen'
import { Goodnight } from '@/features/rewards/Goodnight'
import { Kukoos } from '@/ui'
import { answerInUi } from '../features/lessonUi'
import { withData } from '../withData'

let utterance: { onstart?: () => void; onend?: () => void } | null = null
beforeEach(() => {
  utterance = null
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: (u: typeof utterance) => {
        utterance = u
      },
      cancel: vi.fn(),
      getVoices: () => [],
    },
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    },
  })
})
afterEach(() => {
  cancelSpeech()
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

const kukoos = () => screen.getAllByTestId('kukoos')[0] as HTMLElement

describe('Kukoos (AC1, AC3, AC4)', () => {
  it.each(['idle', 'happy', 'cheer', 'think', 'encourage', 'sleep', 'fly'] as const)(
    'renders the %s mood',
    (mood) => {
      render(<Kukoos mood={mood} />)
      expect(kukoos()).toHaveAttribute('data-mood', mood)
      expect(kukoos()).toHaveClass(`kukoos--${mood}`)
    },
  )

  it('wears the space helmet only when asked', () => {
    const { rerender } = render(<Kukoos />)
    expect(screen.queryByTestId('kukoos-helmet')).toBeNull()
    rerender(<Kukoos helmet />)
    expect(screen.getByTestId('kukoos-helmet')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName('Kukoos the bird in a space helmet')
  })

  it('moves its beak while speech plays, and stops when it ends', () => {
    render(<Kukoos talks />)
    expect(kukoos()).not.toHaveAttribute('data-talking')
    act(() => speak('Hello!'))
    act(() => utterance?.onstart?.())
    expect(kukoos()).toHaveAttribute('data-talking')
    act(() => utterance?.onend?.())
    expect(kukoos()).not.toHaveAttribute('data-talking')
  })

  it('a sleeping or non-talking Kukoos never talks', () => {
    render(
      <>
        <Kukoos mood="sleep" talks />
        <Kukoos />
      </>,
    )
    act(() => speak('Hello!'))
    act(() => utterance?.onstart?.())
    for (const k of screen.getAllByTestId('kukoos')) expect(k).not.toHaveAttribute('data-talking')
  })
})

describe('Kukoos reacts in the lesson (AC2)', () => {
  it('encourages on a miss, hops on a correct answer', async () => {
    const q = startLesson({ skillId: 'add.within20', seed: 7, at: 0 }).question
    render(
      withData(<LessonScreen skillId="add.within20" seed={7} onExit={vi.fn()} now={() => 0} />),
    )
    const lessonKukoos = () =>
      within(document.querySelector('.lesson__kukoos') as HTMLElement).getByTestId('kukoos')
    expect(lessonKukoos()).toHaveAttribute('data-mood', 'idle')
    await answerInUi(q, wrongResponse(q))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(lessonKukoos()).toHaveAttribute('data-mood', 'encourage')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await answerInUi(q, correctResponse(q))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(lessonKukoos()).toHaveAttribute('data-mood', 'happy')
  })

  it('sleeps on the Goodnight screen', () => {
    render(
      withData(
        <MemoryRouter>
          <Goodnight minutes={60} />
        </MemoryRouter>,
      ),
    )
    expect(kukoos()).toHaveAttribute('data-mood', 'sleep')
  })
})
