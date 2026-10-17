import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/app/App'

describe('App', () => {
  it('opens straight onto the map once storage is open (spec 007)', async () => {
    render(<App />)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hi, Explorer!' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play next: Add within 20' })).toBeEnabled()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })
})
