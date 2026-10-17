import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Question } from '@/domain'
import { ColumnQuestion } from '@/question-kinds/ColumnQuestion'
import { lastResponse, renderQuestion } from './helpers'

const columnQ = (a: number, b: number, op: '+' | '-'): Question => ({
  id: `col:${a}${op}${b}`,
  skillId: op === '-' ? 'sub.3digit.acrossZero' : 'add.3digit.carryBoth',
  difficulty: 3,
  kind: 'column',
  seed: 0,
  prompt: { text: '', speech: '' },
  payload: { kind: 'column', a, b, op, columns: Math.max(String(a).length, String(b).length) },
  answer: { type: 'number', value: op === '-' ? a - b : a + b },
  hints: [],
  arithmetic: { a, b, op, unknown: 'result' },
})

const tap = (name: RegExp | string) => userEvent.click(screen.getByRole('button', { name }))
const key = (d: string) => userEvent.click(screen.getByRole('button', { name: d }))

describe('ColumnQuestion (AC7)', () => {
  it('borrows across zero: 403 − 178', async () => {
    const { onBubble } = renderQuestion(ColumnQuestion, columnQ(403, 178, '-'))
    // The tens 0 has nothing to lend yet.
    await tap(/Trade from the tens 0/)
    expect(onBubble).toHaveBeenLastCalledWith('Nothing to trade here. Try the next one!')

    await tap(/Trade from the hundreds 4/)
    expect(screen.getByTestId('mark-2')).toHaveTextContent('3')
    expect(screen.getByTestId('mark-1')).toHaveTextContent('10')

    await tap(/Trade from the tens 0, now 10/)
    expect(screen.getByTestId('mark-1')).toHaveTextContent('9')
    expect(screen.getByTestId('mark-0')).toHaveTextContent('13')
    expect(screen.getByTestId('top-1')).toHaveClass('cg__top--traded')

    await tap(/Trade from the ones/)
    expect(onBubble).toHaveBeenLastCalledWith('Nothing to trade here. Try the next one!')
  })

  it('fills answer cells right to left and reports digits ones-first', async () => {
    const { onChange } = renderQuestion(ColumnQuestion, columnQ(403, 178, '-'))
    expect(screen.getByTestId('cell-0')).toHaveClass('cg__cell--focus')
    await key('5')
    expect(lastResponse(onChange)).toEqual({ kind: 'columnDigits', digits: [5, null, null] })
    await key('2')
    await key('2')
    expect(lastResponse(onChange)).toEqual({ kind: 'columnDigits', digits: [5, 2, 2] })
    expect(screen.getByTestId('cell-2')).toHaveTextContent('2')
  })

  it('backspace clears the last digit; tapping a cell focuses it', async () => {
    const { onChange } = renderQuestion(ColumnQuestion, columnQ(403, 178, '-'))
    await key('5')
    await key('3')
    await key('Delete')
    expect(screen.getByTestId('cell-1')).toHaveTextContent('')
    await key('Delete')
    expect(lastResponse(onChange)).toBeNull()
    await userEvent.click(screen.getByTestId('cell-1'))
    expect(screen.getByTestId('cell-1')).toHaveClass('cg__cell--focus')
  })

  it('guided mode walks one column at a time with Kukoos step text', async () => {
    const { onBubble } = renderQuestion(ColumnQuestion, columnQ(403, 178, '-'), { guided: true })
    expect(onBubble).toHaveBeenLastCalledWith('Ones: 3 − 8. No tens? Open a hundred first!')
    expect(screen.getByTestId('cell-0')).toHaveClass('cg--active')
    expect(screen.getByTestId('cell-2')).toHaveClass('cg--dim')
    await key('5')
    expect(onBubble).toHaveBeenLastCalledWith('Tens: 9 − 7 = ?')
    expect(screen.getByTestId('cell-1')).toHaveClass('cg--active')
  })

  it('addition has carry boxes instead of trades', async () => {
    renderQuestion(ColumnQuestion, columnQ(478, 356, '+'))
    const carry = screen.getByRole('button', { name: 'Carry into the tens, empty' })
    await userEvent.click(carry)
    expect(screen.getByRole('button', { name: 'Carry into the tens, 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: /Trade from/ })).toBeNull()
  })

  it('marks wrong cells after a miss and reveals the worked solution', () => {
    const q = columnQ(403, 178, '-')
    const { rerenderWith } = renderQuestion(ColumnQuestion, q, {
      feedback: 'solution',
      locked: true,
    })
    const grid = screen.getByTestId('column-grid')
    expect(within(grid).getByTestId('cell-0')).toHaveTextContent('5')
    expect(within(grid).getByTestId('cell-1')).toHaveTextContent('2')
    expect(within(grid).getByTestId('cell-2')).toHaveTextContent('2')
    expect(screen.getByTestId('mark-0')).toHaveTextContent('13')
    expect(screen.getByTestId('cell-0')).toHaveClass('cg__cell--correct')
    rerenderWith({ feedback: 'correct' })
    expect(screen.getByTestId('cell-0')).toHaveClass('cg__cell--correct')
  })
})
