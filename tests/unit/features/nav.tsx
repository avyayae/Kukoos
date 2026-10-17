import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { createNullRepositories, type Repositories } from '@/data'
import { withData } from '../withData'

/** Renders the real routes at `path` inside the app providers. */
export function renderAt(path: string, repos: Repositories = createNullRepositories()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(withData(<RouterProvider router={router} />, repos))
  return router
}

/** Answers the grown-up check ("What is 13 × 4?") correctly, or wrongly. */
export async function passGate({ wrong = false } = {}) {
  const heading = await screen.findByRole('heading', { name: /What is \d+ × \d+\?/ })
  const [, a, b] = /What is (\d+) × (\d+)/.exec(heading.textContent ?? '') ?? []
  const answer = Number(a) * Number(b)
  const choices = screen.getAllByRole('button').filter((btn) => /^\d+$/.test(btn.textContent ?? ''))
  const pick = choices.find((btn) => (Number(btn.textContent) === answer) !== wrong)
  if (!pick) throw new Error('gate choice not found')
  await userEvent.click(pick)
}

/** Renders a grown-up route and passes the gate. */
export async function renderGrownUp(path: string, repos: Repositories) {
  const router = renderAt(path, repos)
  await passGate()
  return router
}
