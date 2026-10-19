import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testStore } from '../withData'
import { renderAt, typePin } from './nav'

afterEach(() => {
  vi.useRealTimers()
})

describe('grown-ups PIN gate (spec 011 AC2–AC5)', () => {
  it('first visit creates a PIN (typed twice); a mismatch starts over', async () => {
    const { repos } = testStore()
    renderAt('/grown-ups', repos)
    await screen.findByRole('heading', { name: 'Create a grown-up PIN' })
    await typePin('1357')
    await screen.findByRole('heading', { name: 'Type the PIN again' })
    await typePin('1350')
    expect(
      await screen.findByRole('heading', { name: 'Create a grown-up PIN' }),
    ).toBeInTheDocument()
    expect(screen.getByText("Those PINs didn't match. Let's start again.")).toBeInTheDocument()
    await typePin('1357')
    await typePin('1357')
    expect(await screen.findByRole('heading', { name: /^Grown-ups$/ })).toBeInTheDocument()
    expect(await repos.device.checkPin('1357')).toBe(true)
  })

  it('the dots fill as digits are typed, and Delete removes one', async () => {
    const { repos } = testStore()
    await repos.device.setPin('2468')
    renderAt('/grown-ups', repos)
    await screen.findByRole('heading', { name: 'Enter the grown-up PIN' })
    await typePin('24')
    expect(screen.getByRole('img', { name: '2 of 4 digits entered' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('img', { name: '1 of 4 digits entered' })).toBeInTheDocument()
  })

  it('5 wrong PINs pause entry for 30 seconds', async () => {
    // Only the clock and the countdown interval are faked (IndexedDB needs real timers).
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    const user = userEvent.setup()
    const { repos } = testStore()
    await repos.device.setPin('2468')
    renderAt('/grown-ups', repos)
    await screen.findByRole('heading', { name: 'Enter the grown-up PIN' })
    const pad = () => screen.getByRole('group', { name: 'Number pad' })
    for (let i = 0; i < 5; i++) {
      for (const d of '1111') await user.click(screen.getByRole('button', { name: d }))
    }
    expect(await screen.findByText(/Too many tries\. Wait 30 seconds\./)).toBeInTheDocument()
    expect(pad().querySelector('button')).toBeDisabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000)
    })
    expect(pad().querySelector('button')).toBeEnabled()
  })

  it('"Forgot PIN?" asks a grown-up question, then sets a new PIN; Lock locks again', async () => {
    const { repos } = testStore()
    await repos.device.setPin('2468')
    renderAt('/grown-ups', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Forgot PIN?' }))
    const question = screen.getByText(/What is \d+ × \d+\?/).textContent ?? ''
    const [, a, b] = /(\d+) × (\d+)/.exec(question) ?? []
    await typePin('1')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByText('Not quite. Here is a new one.')).toBeInTheDocument()

    const next = screen.getByText(/What is \d+ × \d+\?/).textContent ?? ''
    const [, c, d] = /(\d+) × (\d+)/.exec(next) ?? []
    expect([a, b, c, d].every(Boolean)).toBe(true)
    await typePin(String(Number(c) * Number(d)))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    await screen.findByRole('heading', { name: 'Create a grown-up PIN' })
    await typePin('9753')
    await typePin('9753')
    await screen.findByRole('heading', { name: /^Grown-ups$/ })
    expect(await repos.device.checkPin('9753')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: /Lock/ }))
    expect(
      await screen.findByRole('heading', { name: 'Enter the grown-up PIN' }),
    ).toBeInTheDocument()
  })
})
