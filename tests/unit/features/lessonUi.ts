import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toDigits } from '@/domain/arithmetic/digits'
import type { Question, Response } from '@/domain'

const SIGN_LABEL = { '<': 'less than', '=': 'equal to', '>': 'greater than' } as const

/** Enters `response` for `q` through the real UI (keypad, tiles, column cells). */
export async function answerInUi(q: Question, response: Response) {
  const press = (label: string) => userEvent.click(screen.getByRole('button', { name: label }))
  switch (response.kind) {
    case 'number':
      for (const d of String(response.value)) await press(d)
      return
    case 'columnDigits':
      // Column cells fill right to left: type the ones digit first.
      for (const d of response.digits) if (d !== null) await press(String(d))
      return
    case 'choice': {
      if (q.payload.kind !== 'mcq') throw new Error('choice for non-mcq')
      const value = q.payload.choices[response.index]
      await userEvent.click(screen.getByRole('radio', { name: String(value) }))
      return
    }
    case 'boolean':
      await userEvent.click(screen.getByRole('radio', { name: response.value ? 'True' : 'False' }))
      return
    case 'comparison':
      await userEvent.click(screen.getByRole('radio', { name: SIGN_LABEL[response.value] }))
  }
}

/** Column answers typed as digits ones-first. */
export const columnDigitsOf = (n: number) => toDigits(n)
