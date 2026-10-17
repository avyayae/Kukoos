import { render } from '@testing-library/react'
import type { ComponentType } from 'react'
import { vi } from 'vitest'
import type { Question, Response } from '@/domain'
import type { FeedbackState, RendererProps } from '@/question-kinds/types'

/** Renders a question renderer with spies and sensible defaults. */
export function renderQuestion(
  Renderer: ComponentType<RendererProps>,
  question: Question,
  overrides: Partial<{
    guided: boolean
    locked: boolean
    feedback: FeedbackState
    wrongResponses: Response[]
  }> = {},
) {
  const onChange = vi.fn<(r: Response | null) => void>()
  const onBubble = vi.fn<(t: string | null) => void>()
  const props: RendererProps = {
    question,
    guided: false,
    locked: false,
    feedback: 'none',
    wrongResponses: [],
    onChange,
    onBubble,
    ...overrides,
  }
  const utils = render(<Renderer {...props} />)
  const rerenderWith = (more: Partial<RendererProps>) =>
    utils.rerender(<Renderer {...props} {...more} />)
  return { ...utils, onChange, onBubble, rerenderWith }
}

/** Last value reported through onChange. */
export const lastResponse = (fn: { mock: { calls: unknown[][] } }) => fn.mock.calls.at(-1)?.[0]
