import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InstallSection } from '@/features/grownups/InstallSection'

function mockStandalone(matches: boolean) {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) =>
      ({
        matches: q === '(display-mode: standalone)' ? matches : false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('install on a tablet (spec 012 AC4)', () => {
  it('shows the address and steps; the browser prompt adds an Install button', async () => {
    mockStandalone(false)
    render(<InstallSection />)
    expect(screen.getByText(/localhost/)).toBeInTheDocument()
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull()

    const prompt = vi.fn(() => Promise.resolve())
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    act(() => {
      window.dispatchEvent(event)
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Install app' }))
    expect(prompt).toHaveBeenCalledOnce()
    expect(await screen.findByTestId('install-status')).toHaveTextContent('installed')
  })

  it('says so when already installed', () => {
    mockStandalone(true)
    render(<InstallSection />)
    expect(screen.getByTestId('install-status')).toHaveTextContent('works offline')
  })
})
