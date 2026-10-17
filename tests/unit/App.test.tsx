import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '@/app/App'

describe('App shell', () => {
  it('shows the title, Kukoos and the Start button once storage is open', async () => {
    render(<App />)
    expect(await screen.findByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Kukoos Math Quest' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Kukoos the bird' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })
})
