import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceTile, ConfirmSheet, FeedbackBanner, Keypad, Kukoos, ProgressBar } from '@/ui'

describe('ProgressBar', () => {
  it('exposes progress to assistive tech and clamps', () => {
    const { rerender } = render(<ProgressBar value={0.3} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
    rerender(<ProgressBar value={1.7} hot />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveClass('progress--hot')
  })
})

describe('Keypad', () => {
  it('sends digits and backspace from taps', async () => {
    const onDigit = vi.fn()
    const onBackspace = vi.fn()
    render(<Keypad onDigit={onDigit} onBackspace={onBackspace} />)
    await userEvent.click(screen.getByRole('button', { name: '7' }))
    await userEvent.click(screen.getByRole('button', { name: '0' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDigit.mock.calls).toEqual([[7], [0]])
    expect(onBackspace).toHaveBeenCalledOnce()
  })

  it('listens to the physical keyboard unless disabled', () => {
    const onDigit = vi.fn()
    const onBackspace = vi.fn()
    const { rerender } = render(<Keypad onDigit={onDigit} onBackspace={onBackspace} />)
    fireEvent.keyDown(window, { key: '4' })
    fireEvent.keyDown(window, { key: 'Backspace' })
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: '5', ctrlKey: true })
    expect(onDigit.mock.calls).toEqual([[4]])
    expect(onBackspace).toHaveBeenCalledOnce()

    rerender(<Keypad onDigit={onDigit} onBackspace={onBackspace} disabled />)
    fireEvent.keyDown(window, { key: '9' })
    expect(onDigit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: '9' })).toBeDisabled()
  })

  it('has kid-size keys (xl buttons)', () => {
    render(<Keypad onDigit={vi.fn()} onBackspace={vi.fn()} />)
    expect(screen.getByRole('button', { name: '1' })).toHaveClass('btn3d--xl', 'keypad__key')
  })
})

describe('ChoiceTile', () => {
  it('reflects state with icon + color and reports selection', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <ChoiceTile label="85" onSelect={onSelect}>
        85
      </ChoiceTile>,
    )
    const tile = screen.getByRole('radio', { name: '85' })
    await userEvent.click(tile)
    expect(onSelect).toHaveBeenCalledOnce()
    expect(tile).toHaveAttribute('aria-checked', 'false')

    rerender(
      <ChoiceTile label="85" onSelect={onSelect} state="correct">
        85
      </ChoiceTile>,
    )
    expect(tile).toHaveClass('tile--correct')
    expect(tile).toHaveTextContent('✓')

    rerender(
      <ChoiceTile label="85" onSelect={onSelect} state="incorrect" disabled>
        85
      </ChoiceTile>,
    )
    expect(tile).toHaveClass('tile--incorrect')
    expect(tile).toHaveTextContent('↺')
    expect(tile).toBeDisabled()
  })
})

describe('FeedbackBanner', () => {
  it('shows title/body, focuses the main action and wires buttons', async () => {
    const onAction = vi.fn()
    const onShow = vi.fn()
    render(
      <FeedbackBanner
        variant="notYet"
        title="Almost!"
        body="Can we take 8 from 6? Trade a ten first!"
        actionLabel="Try again"
        onAction={onAction}
        secondary={{ label: 'Show me', onClick: onShow }}
      />,
    )
    expect(screen.getByRole('heading', { name: /Almost!/ })).toBeInTheDocument()
    expect(screen.getByText(/take 8 from 6/)).toBeInTheDocument()
    const action = screen.getByRole('button', { name: 'Try again' })
    expect(action).toHaveFocus()
    expect(action).toHaveClass('btn3d--danger-soft')
    await userEvent.click(screen.getByRole('button', { name: 'Show me' }))
    await userEvent.click(action)
    expect(onShow).toHaveBeenCalledOnce()
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('uses the success button for correct answers', () => {
    render(
      <FeedbackBanner
        variant="correct"
        title="Roar-some!"
        actionLabel="Continue"
        onAction={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass('btn3d--success')
    expect(screen.getByTestId('feedback')).toHaveClass('banner--correct')
  })
})

describe('Kukoos', () => {
  it('shows a mood and an optional bubble', () => {
    const { rerender } = render(<Kukoos mood="happy">Awesome!</Kukoos>)
    expect(screen.getByRole('img', { name: 'Kukoos the bird' }).parentElement).toHaveAttribute(
      'data-mood',
      'happy',
    )
    expect(screen.getByTestId('kukoos-bubble')).toHaveTextContent('Awesome!')
    rerender(<Kukoos />)
    expect(screen.queryByTestId('kukoos-bubble')).toBeNull()
  })
})

describe('ConfirmSheet', () => {
  it('is hidden when closed; focuses the safe choice; Escape cancels', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const props = {
      title: 'Leave this mission?',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      onConfirm,
      onCancel,
    }
    const { rerender } = render(<ConfirmSheet open={false} {...props} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<ConfirmSheet open {...props} />)
    expect(screen.getByRole('dialog', { name: 'Leave this mission?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stay' })).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
