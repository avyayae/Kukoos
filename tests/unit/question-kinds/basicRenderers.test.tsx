import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { generateQuestion, type Question } from '@/domain'
import { CompareQuestion, McqQuestion, TrueFalseQuestion } from '@/question-kinds/ChoiceQuestions'
import { NumericQuestion } from '@/question-kinds/NumericQuestion'
import { lastResponse, renderQuestion } from './helpers'

const numeric = generateQuestion('sub.within100.regroup', {
  difficulty: 2,
  kind: 'numeric',
  seed: 1,
})
const mcq = generateQuestion('add.within100.regroup', { difficulty: 2, kind: 'mcq', seed: 2 })
const tf = generateQuestion('add.within20', { difficulty: 2, kind: 'trueFalse', seed: 3 })
const cmp = generateQuestion('pv.compare3digit', { difficulty: 3, kind: 'compare', seed: 4 })
const answerOf = (q: Question) => q.answer.value

describe('NumericQuestion (AC3)', () => {
  it('reports the typed number, max 3 digits, and null when cleared', async () => {
    const { onChange } = renderQuestion(NumericQuestion, numeric)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(lastResponse(onChange)).toEqual({ kind: 'number', value: 12 })
    expect(screen.getByTestId('answer-slot')).toHaveTextContent('12')
    for (const d of ['3', '4']) await userEvent.click(screen.getByRole('button', { name: d }))
    expect(screen.getByTestId('answer-slot')).toHaveTextContent('123')
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(lastResponse(onChange)).toBeNull()
  })

  it('locks the keypad and reveals the answer for the solution', () => {
    const { rerenderWith } = renderQuestion(NumericQuestion, numeric, { locked: true })
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
    rerenderWith({ feedback: 'solution' })
    expect(screen.getByTestId('answer-slot')).toHaveTextContent(String(answerOf(numeric)))
    expect(screen.getByTestId('answer-slot')).toHaveClass('answer-slot--correct')
  })
})

describe('McqQuestion (AC3)', () => {
  it('reports the chosen tile and shows it in the answer box', async () => {
    if (mcq.payload.kind !== 'mcq') throw new Error('mcq expected')
    const { onChange } = renderQuestion(McqQuestion, mcq)
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    const first = mcq.payload.choices[0] as number
    await userEvent.click(screen.getByRole('radio', { name: String(first) }))
    expect(lastResponse(onChange)).toEqual({ kind: 'choice', index: 0 })
    expect(screen.getByTestId('answer-slot')).toHaveTextContent(String(first))
  })

  it('disables earlier wrong tiles and marks the answer on success', () => {
    if (mcq.payload.kind !== 'mcq') throw new Error('mcq expected')
    const wrongIndex = mcq.payload.choices.findIndex((c) => c !== answerOf(mcq))
    const { rerenderWith } = renderQuestion(McqQuestion, mcq, {
      wrongResponses: [{ kind: 'choice', index: wrongIndex }],
    })
    const wrongTile = screen.getByRole('radio', { name: String(mcq.payload.choices[wrongIndex]) })
    expect(wrongTile).toBeDisabled()
    expect(wrongTile).toHaveClass('tile--incorrect')
    rerenderWith({ feedback: 'correct', wrongResponses: [] })
    expect(screen.getByRole('radio', { name: String(answerOf(mcq)) })).toHaveClass('tile--correct')
  })
})

describe('TrueFalseQuestion (AC3)', () => {
  it('reports true/false', async () => {
    const { onChange } = renderQuestion(TrueFalseQuestion, tf)
    await userEvent.click(screen.getByRole('radio', { name: 'False' }))
    expect(lastResponse(onChange)).toEqual({ kind: 'boolean', value: false })
    await userEvent.click(screen.getByRole('radio', { name: 'True' }))
    expect(lastResponse(onChange)).toEqual({ kind: 'boolean', value: true })
  })
})

describe('CompareQuestion (AC3)', () => {
  it('reports the chosen sign, shows it between the numbers, reveals on solution', async () => {
    const { onChange, rerenderWith } = renderQuestion(CompareQuestion, cmp)
    await userEvent.click(screen.getByRole('radio', { name: 'greater than' }))
    expect(lastResponse(onChange)).toEqual({ kind: 'comparison', value: '>' })
    expect(screen.getByTestId('answer-slot')).toHaveTextContent('>')
    rerenderWith({ feedback: 'solution', locked: true })
    expect(screen.getByTestId('answer-slot')).toHaveTextContent(String(answerOf(cmp)))
    expect(screen.getByRole('radio', { name: 'less than' })).toBeDisabled()
  })
})
