import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { generateQuestion, SKILLS } from '@/domain'
import { DisplayView } from '@/visuals/DisplayView'

describe('DisplayView', () => {
  it('shows an equation with the typed answer in the unknown box', () => {
    render(
      <DisplayView
        display={{ type: 'equation', equation: { terms: [36, 28], ops: ['-'], result: null } }}
        value="8"
      />,
    )
    expect(screen.getByTestId('display')).toHaveTextContent('36−28=8')
    expect(screen.getByTestId('answer-slot')).toHaveAccessibleName('Your answer, 8')
  })

  it('puts the box where the unknown is (missing operand)', () => {
    render(
      <DisplayView
        display={{
          type: 'equation',
          equation: { terms: [300, null, 5], ops: ['+', '+'], result: 345 },
        }}
        value=""
        state="incorrect"
      />,
    )
    expect(screen.getByTestId('display')).toHaveTextContent('300+?+5=345')
    expect(screen.getByTestId('answer-slot')).toHaveClass(
      'answer-slot--empty',
      'answer-slot--incorrect',
    )
  })

  it('shows units both ways', () => {
    const { rerender } = render(
      <DisplayView display={{ type: 'units', tens: 2, ones: null, total: 36 }} value="16" />,
    )
    expect(screen.getByTestId('display')).toHaveTextContent('36=2tens16ones')
    rerender(
      <DisplayView
        display={{ type: 'units', hundreds: 4, tens: 7, ones: 2, total: null }}
        value=""
      />,
    )
    expect(screen.getByTestId('display')).toHaveTextContent('4hundreds7tens2ones=?')
  })

  it('shows the number for digit-in-place questions', () => {
    render(<DisplayView display={{ type: 'digitInPlace', number: 472, place: 1 }} value="7" />)
    expect(screen.getByTestId('display')).toHaveTextContent('4727')
  })

  it('renders every display the generators produce, with exactly one answer box', () => {
    for (const skill of SKILLS) {
      for (const kind of skill.kinds) {
        if (kind === 'column' || kind === 'compare' || kind === 'trueFalse') continue
        for (let seed = 0; seed < 5; seed++) {
          const q = generateQuestion(skill.id, { difficulty: 4, kind, seed })
          if (!('display' in q.payload)) continue
          const { unmount } = render(<DisplayView display={q.payload.display} value="" />)
          expect(screen.getAllByTestId('answer-slot'), q.id).toHaveLength(1)
          unmount()
        }
      }
    }
  })
})
