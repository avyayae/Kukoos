import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Repositories } from '@/data'
import { startChessLesson } from '@/domain/chess/lesson'
import { testStore } from '../withData'
import { renderAt } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

beforeEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

const profileId = async (repos: Repositories) => (await repos.profiles.ensureCurrent())?.id ?? ''

/** "Tap e4!" → e4 */
async function tapAsked() {
  const text = (await screen.findByTestId('bubble-text')).textContent ?? ''
  const square = /Tap ([a-h][1-8])!/.exec(text)?.[1] ?? /start\? Tap it!/.exec(text)?.[0]
  await userEvent.click(screen.getByTestId(`sq-${square}`))
}

async function next() {
  await userEvent.click(
    within(screen.getByTestId('feedback')).getByRole('button', { name: 'Continue' }),
  )
}

describe('chess lesson screen (spec 016 AC4)', () => {
  it('plays a "find the square" lesson to the celebration and saves it', async () => {
    const { repos, db } = testStore()
    renderAt('/chess/lesson/chess.board?seed=3&learn', repos)
    for (let i = 0; i < 8; i++) {
      await tapAsked()
      expect(await screen.findByTestId('feedback')).toHaveAttribute('aria-label')
      await next()
    }
    expect(await screen.findByRole('heading', { name: 'Mission complete!' })).toBeInTheDocument()
    await waitFor(async () => expect(await db.lessons.count()).toBe(1))
    const progress = await repos.progress.forProfile(await profileId(repos))
    expect(progress['chess.board']?.attempts).toBe(8)
  })

  it('a wrong tap says which square it was, then shows the answer', async () => {
    const { repos } = testStore()
    renderAt('/chess/lesson/chess.board?seed=3&learn', repos)
    const text = (await screen.findByTestId('bubble-text')).textContent ?? ''
    const asked = /Tap ([a-h][1-8])!/.exec(text)?.[1] ?? 'a1'
    const wrong = asked === 'h8' ? 'h7' : 'h8'
    await userEvent.click(screen.getByTestId(`sq-${wrong}`))
    const feedback = await screen.findByTestId('feedback')
    expect(feedback).toHaveTextContent(`That’s ${wrong}. Find ${asked}!`)
    await userEvent.click(within(feedback).getByRole('button', { name: 'Try again' }))
    await userEvent.click(screen.getByTestId(`sq-${wrong}`))
    expect(await screen.findByTestId('feedback')).toHaveTextContent(`It’s ${asked}.`)
    expect(screen.getByTestId(`sq-${asked}`)).toHaveAccessibleName(/the answer/)
  })
})

describe('"Already know this?" (AC6)', () => {
  it('three right first time: crowned, and the next skill opens', async () => {
    const { repos } = testStore()
    renderAt('/chess/lesson/chess.board?seed=5', repos)
    expect(await screen.findByRole('heading', { name: 'Already know this?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show Kukoos!' }))
    for (let i = 0; i < 3; i++) {
      await tapAsked()
      await next()
    }
    expect(
      await screen.findByRole('heading', { name: 'You know this already!' }),
    ).toBeInTheDocument()
    const progress = await repos.progress.forProfile(await profileId(repos))
    expect(progress['chess.board']).toMatchObject({ crowned: true, preMastered: true })
  })

  it('a miss: "Let’s learn it together!" and the normal lesson starts', async () => {
    const { repos } = testStore()
    renderAt('/chess/lesson/chess.board?seed=5', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Show Kukoos!' }))
    const text = (await screen.findByTestId('bubble-text')).textContent ?? ''
    const asked = /Tap ([a-h][1-8])!/.exec(text)?.[1] ?? 'a1'
    await userEvent.click(screen.getByTestId(`sq-${asked === 'h8' ? 'h7' : 'h8'}`))
    await userEvent.click(
      within(await screen.findByTestId('feedback')).getByRole('button', { name: 'Try again' }),
    )
    await userEvent.click(screen.getByTestId(`sq-${asked}`))
    await next()
    for (let i = 0; i < 2; i++) {
      await tapAsked()
      await next()
    }
    expect(
      await screen.findByRole('heading', { name: 'Let’s learn it together!' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Let’s go!' }))
    expect(await screen.findByTestId('chess-lesson')).toBeInTheDocument()
    const progress = await repos.progress.forProfile(await profileId(repos))
    expect(progress['chess.board']).toBeUndefined()
  })

  it('"Teach me" goes straight to the lesson', async () => {
    const { repos } = testStore()
    renderAt('/chess/lesson/chess.rook?seed=5', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Teach me' }))
    expect(await screen.findByTestId('chess-lesson')).toBeInTheDocument()
  })
})

describe('mistake patterns from the board (AC8)', () => {
  it('a knight moved like a bishop is saved with the answer', async () => {
    const { repos, db } = testStore()
    renderAt('/chess/lesson/chess.knight?seed=2&learn', repos)
    // A knight lesson starts with "Move the knight to the star!".
    expect(await screen.findByTestId('bubble-text')).toHaveTextContent(
      'Move the knight to the star!',
    )
    const knight = screen.getByRole('button', { name: /White knight/ })
    const from = knight.dataset.square ?? 'a1'
    const file = 'abcdefgh'.indexOf(from[0] ?? 'a')
    const rank = Number(from[1])
    const diag = `${'abcdefgh'[file < 7 ? file + 1 : file - 1]}${rank < 8 ? rank + 1 : rank - 1}`

    await userEvent.click(knight)
    await userEvent.click(screen.getByTestId(`sq-${diag}`))
    expect(await screen.findByText('The knight jumps in an L shape.')).toBeInTheDocument()
    expect(screen.queryByTestId('feedback')).toBeNull() // not a miss

    // Still selected after the hint: tap the star to try again.
    await userEvent.click(screen.getByRole('button', { name: /star/ }))
    await next()
    await userEvent.click(screen.getByRole('button', { name: 'Leave lesson' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(1))
    const [attempt] = await db.attempts.toArray()
    expect(attempt).toMatchObject({ firstTry: true, misconceptions: ['chess.not-how-it-moves:n'] })
  })
})

describe('"Is the king in check?" doesn’t give the answer away', () => {
  it('no check glow or "in check" name on the board', async () => {
    // A seed whose first puzzle really is check.
    let seed = 1
    while (startChessLesson({ skillId: 'chess.check', seed, at: 0 }).puzzle.answer !== 'Check!')
      seed++
    const { repos } = testStore()
    renderAt(`/chess/lesson/chess.check?seed=${seed}&learn`, repos)
    expect(await screen.findByTestId('bubble-text')).toHaveTextContent('Is the king in check?')
    expect(screen.queryAllByRole('button', { name: /in check/ })).toHaveLength(0)
    expect(document.querySelector('.sq--check')).toBeNull()
  })
})
