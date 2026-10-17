import { useCallback } from 'react'
import { Keypad } from '@/ui'
import { DisplayView } from '@/visuals/DisplayView'
import { slotState } from './feedbackStyles'
import type { RendererProps } from './types'
import { useTypedNumber } from './useTypedNumber'

/** Display + on-screen keypad. Used for `numeric` questions. */
export function NumericQuestion({ question, locked, feedback, onChange }: RendererProps) {
  const onValue = useCallback(
    (value: number | null) => onChange(value === null ? null : { kind: 'number', value }),
    [onChange],
  )
  const { text, push, pop } = useTypedNumber(onValue)
  if (question.payload.kind !== 'numeric') return null
  const shown =
    feedback === 'solution' && question.answer.type === 'number'
      ? String(question.answer.value)
      : text

  return (
    <div className="qa qa--split">
      <div className="qa__main">
        <DisplayView display={question.payload.display} value={shown} state={slotState(feedback)} />
      </div>
      <div className="qa__input">
        <Keypad onDigit={push} onBackspace={pop} disabled={locked} />
      </div>
    </div>
  )
}
