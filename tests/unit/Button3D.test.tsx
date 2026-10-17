import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button3D } from '@/ui'

describe('Button3D', () => {
  it('renders a native button with variant and size classes', () => {
    render(
      <Button3D variant="secondary" size="xl" block>
        Check
      </Button3D>,
    )
    const button = screen.getByRole('button', { name: 'Check' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('btn3d', 'btn3d--secondary', 'btn3d--xl', 'btn3d--block')
  })

  it('defaults to primary / lg', () => {
    render(<Button3D>Start</Button3D>)
    expect(screen.getByRole('button')).toHaveClass('btn3d--primary', 'btn3d--lg')
  })

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button3D onClick={onClick}>Go</Button3D>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button3D disabled onClick={onClick}>
        Go
      </Button3D>,
    )
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows a spinner, sets aria-busy and blocks clicks while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button3D loading onClick={onClick}>
        Save
      </Button3D>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('.btn3d__spinner')).not.toBeNull()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders an icon before the label', () => {
    render(<Button3D icon={<span data-testid="icon" />}>Play</Button3D>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })
})
