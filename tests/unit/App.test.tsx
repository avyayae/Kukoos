import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/app/App'

describe('App', () => {
  it('a brand-new device meets Kukoos first, then lands on the map (specs 007, 010)', async () => {
    render(<App />)
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: "Let's go!" }))
    // What do you want to learn? (spec 013)
    await userEvent.click(screen.getByRole('button', { name: 'Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: "That's me!" }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hi, Explorer!' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play next: Add within 20' })).toBeEnabled()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
