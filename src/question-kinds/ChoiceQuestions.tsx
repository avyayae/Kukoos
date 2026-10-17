import { useState } from 'react'
import type { Comparison, Response } from '@/domain'
import { ChoiceTile, type ChoiceTileState } from '@/ui'
import { DisplayView } from '@/visuals/DisplayView'
import { slotState } from './feedbackStyles'
import type { RendererProps } from './types'

/** Tile state from the current selection, earlier misses and feedback. */
function tileState(
  isAnswer: boolean,
  isSelected: boolean,
  wasWrong: boolean,
  feedback: RendererProps['feedback'],
): ChoiceTileState {
  if (isAnswer && (feedback === 'correct' || feedback === 'solution')) return 'correct'
  if (wasWrong || (isSelected && feedback === 'incorrect')) return 'incorrect'
  return isSelected ? 'selected' : 'default'
}

const sameResponse = (a: Response, b: Response) => JSON.stringify(a) === JSON.stringify(b)

function useChoice<T>(onChange: RendererProps['onChange'], toResponse: (value: T) => Response) {
  const [selected, setSelected] = useState<T | null>(null)
  const select = (value: T) => {
    setSelected(value)
    onChange(toResponse(value))
  }
  return { selected, select }
}

/** 4 answer tiles (2×2 on phones, 4×1 on landscape tablets). */
export function McqQuestion({
  question,
  locked,
  feedback,
  wrongResponses,
  onChange,
}: RendererProps) {
  const { selected, select } = useChoice<number>(onChange, (index) => ({ kind: 'choice', index }))
  if (question.payload.kind !== 'mcq') return null
  const { choices, display } = question.payload
  const answer = question.answer.value
  const shown = selected === null ? '' : String(choices[selected])

  return (
    <div className="qa">
      <div className="qa__main">
        <DisplayView display={display} value={shown} state={slotState(feedback)} />
      </div>
      <div className="tiles tiles--4" role="radiogroup" aria-label="Choices">
        {choices.map((choice, index) => {
          const wasWrong = wrongResponses.some((r) => sameResponse(r, { kind: 'choice', index }))
          return (
            <ChoiceTile
              key={index}
              label={String(choice)}
              state={tileState(choice === answer, selected === index, wasWrong, feedback)}
              disabled={locked || wasWrong}
              onSelect={() => select(index)}
            >
              <span className="num">{choice}</span>
            </ChoiceTile>
          )
        })}
      </div>
    </div>
  )
}

/** ✓ True / ✗ False tiles under the equation being judged. */
export function TrueFalseQuestion({
  question,
  locked,
  feedback,
  wrongResponses,
  onChange,
}: RendererProps) {
  const { selected, select } = useChoice<boolean>(onChange, (value) => ({ kind: 'boolean', value }))
  if (question.payload.kind !== 'trueFalse') return null
  const options = [
    { value: true, label: 'True', icon: '✓' },
    { value: false, label: 'False', icon: '✗' },
  ]
  return (
    <div className="qa">
      <div className="qa__main">
        <DisplayView display={question.payload.display} value="" />
      </div>
      <div className="tiles" role="radiogroup" aria-label="True or false">
        {options.map((o) => {
          const wasWrong = wrongResponses.some((r) =>
            sameResponse(r, { kind: 'boolean', value: o.value }),
          )
          return (
            <ChoiceTile
              key={o.label}
              label={o.label}
              state={tileState(
                question.answer.value === o.value,
                selected === o.value,
                wasWrong,
                feedback,
              )}
              disabled={locked || wasWrong}
              onSelect={() => select(o.value)}
            >
              <span aria-hidden="true">{o.icon}</span>&nbsp;{o.label}
            </ChoiceTile>
          )
        })}
      </div>
    </div>
  )
}

const SIGNS: { value: Comparison; label: string }[] = [
  { value: '<', label: 'less than' },
  { value: '=', label: 'equal to' },
  { value: '>', label: 'greater than' },
]

/** "452 ? 425" with <, =, > tiles. */
export function CompareQuestion({
  question,
  locked,
  feedback,
  wrongResponses,
  onChange,
}: RendererProps) {
  const { selected, select } = useChoice<Comparison>(onChange, (value) => ({
    kind: 'comparison',
    value,
  }))
  if (question.payload.kind !== 'compare') return null
  const { left, right } = question.payload
  const shown = feedback === 'solution' ? String(question.answer.value) : (selected ?? '')
  return (
    <div className="qa">
      <div className="qa__main">
        <p className="display num" data-testid="display">
          <span>{left}</span>
          <span
            className={`answer-slot answer-slot--${slotState(feedback)}${shown === '' ? ' answer-slot--empty' : ''}`}
            data-testid="answer-slot"
          >
            {shown === '' ? '?' : shown}
          </span>
          <span>{right}</span>
        </p>
      </div>
      <div className="tiles tiles--3" role="radiogroup" aria-label="Signs">
        {SIGNS.map((s) => {
          const wasWrong = wrongResponses.some((r) =>
            sameResponse(r, { kind: 'comparison', value: s.value }),
          )
          return (
            <ChoiceTile
              key={s.value}
              label={s.label}
              state={tileState(
                question.answer.value === s.value,
                selected === s.value,
                wasWrong,
                feedback,
              )}
              disabled={locked || wasWrong}
              onSelect={() => select(s.value)}
            >
              {s.value}
            </ChoiceTile>
          )
        })}
      </div>
    </div>
  )
}
