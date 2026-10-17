import { useCallback, useEffect, useMemo, useState } from 'react'
import { guidedSteps, solveColumns } from '@/domain'
import { toDigits } from '@/domain/arithmetic/digits'
import { say, t } from '@/features/lesson-player/copy'
import { Keypad } from '@/ui'
import { ColumnGrid, type CellState } from '@/visuals/ColumnGrid'
import { initialScratch, solvedScratch, toggleCarry, tradeFrom } from '@/visuals/columnScratch'
import type { RendererProps } from './types'

/**
 * Column method (spec 005 AC7). Digits typed on the keypad fill answer cells right to
 * left; tapping a top digit trades from it; carry boxes toggle. Guided mode highlights
 * one column at a time and puts that column's step in Kukoos's bubble.
 */
export function ColumnQuestion({
  question,
  guided,
  locked,
  feedback,
  onChange,
  onBubble,
}: RendererProps) {
  const payload = question.payload.kind === 'column' ? question.payload : null
  const columns = payload?.columns ?? 1
  const [answer, setAnswer] = useState<(number | null)[]>(() =>
    Array.from({ length: columns }, () => null),
  )
  const [focus, setFocus] = useState(0)
  const [scratch, setScratch] = useState(() => initialScratch(payload?.a ?? 0, columns))

  const steps = useMemo(
    () => (payload ? solveColumns(payload.a, payload.b, payload.op) : []),
    [payload],
  )
  const guideText = useMemo(() => guidedSteps(question).map(say), [question])
  const firstEmpty = answer.findIndex((d) => d === null)
  const activeColumn = guided && !locked && firstEmpty >= 0 ? firstEmpty : null

  useEffect(() => {
    if (!guided) return
    onBubble(activeColumn === null ? null : (guideText[activeColumn] ?? null))
  }, [guided, activeColumn, guideText, onBubble])

  const report = useCallback(
    (next: (number | null)[]) => {
      setAnswer(next)
      onChange(next[0] === null ? null : { kind: 'columnDigits', digits: next })
    },
    [onChange],
  )

  const onDigit = useCallback(
    (digit: number) => {
      const next = [...answer]
      next[focus] = digit
      report(next)
      setFocus(Math.min(columns - 1, focus + 1))
    },
    [answer, focus, columns, report],
  )

  const onBackspace = useCallback(() => {
    const at = answer[focus] === null ? Math.max(0, focus - 1) : focus
    const next = [...answer]
    next[at] = null
    report(next)
    setFocus(at)
  }, [answer, focus, report])

  if (!payload) return null

  const solution = feedback === 'solution'
  const answerDigits = toDigits(question.answer.value as number, columns)
  const shownAnswer = solution ? answerDigits : answer
  const shownScratch = solution ? solvedScratch(steps, columns) : scratch
  const cellState = (place: number): CellState => {
    if (feedback === 'correct' || solution) return 'correct'
    if (
      feedback === 'incorrect' &&
      answer[place] !== null &&
      answer[place] !== answerDigits[place]
    ) {
      return 'incorrect'
    }
    return 'default'
  }

  return (
    <div className="qa qa--split">
      <div className="qa__main">
        <ColumnGrid
          b={payload.b}
          op={payload.op}
          columns={columns}
          scratch={shownScratch}
          answer={shownAnswer}
          focus={focus}
          activeColumn={activeColumn}
          cellState={cellState}
          locked={locked}
          onTapTop={(place) => {
            const result = tradeFrom(scratch, place)
            if (result.ok) setScratch(result.scratch)
            else onBubble(t('column:nothingToTrade'))
          }}
          onToggleCarry={(place) => setScratch((s) => toggleCarry(s, place))}
          onFocusCell={setFocus}
        />
      </div>
      <div className="qa__input">
        <Keypad onDigit={onDigit} onBackspace={onBackspace} disabled={locked} />
      </div>
    </div>
  )
}
