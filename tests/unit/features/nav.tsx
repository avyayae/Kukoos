import { render, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { createNullRepositories, type Repositories } from '@/data'
import { withData } from '../withData'

/** The PIN every test grown-up uses. */
export const TEST_PIN = '2468'

/** Renders the real routes at `path` inside the app providers. */
export function renderAt(path: string, repos: Repositories = createNullRepositories()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(withData(<RouterProvider router={router} />, repos))
  return router
}

/** Taps digits on the PIN pad. */
export async function typePin(pin: string) {
  const pad = screen.getByRole('group', { name: 'Number pad' })
  for (const d of pin) await userEvent.click(within(pad).getByRole('button', { name: d }))
}

/**
 * Gets past the grown-ups lock (spec 011): creates the test PIN on first use, otherwise
 * enters it. `wrong` enters a wrong PIN instead.
 */
export async function passGate({ wrong = false } = {}) {
  const heading = await screen.findByRole('heading', {
    name: /Create a grown-up PIN|Enter the grown-up PIN/,
  })
  if (heading.textContent?.startsWith('Create')) {
    await typePin(TEST_PIN)
    await screen.findByRole('heading', { name: 'Type the PIN again' })
    await typePin(TEST_PIN)
  } else {
    await typePin(wrong ? '1111' : TEST_PIN)
  }
  // Saving / checking the PIN is async: wait until the gate is gone.
  if (!wrong) {
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Grown-ups only' })).toBeNull(),
    )
  }
}

/** Renders a grown-up route and passes the gate. */
export async function renderGrownUp(path: string, repos: Repositories) {
  const router = renderAt(path, repos)
  await passGate()
  return router
}
