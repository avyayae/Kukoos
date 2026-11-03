import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { speak } from '@/audio/tts'
import type { Repositories } from '@/data'
import { newBadges } from '@/domain'
import { chessSkillsIn } from '@/domain/chess/curriculum'
import { testStore } from '../withData'
import { renderAt } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))

beforeEach(() => {
  vi.mocked(speak).mockClear()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

async function chessKid(repos: Repositories, crowned: string[] = []) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, { courses: ['chess'], currentCourse: 'chess' })
  for (const skillId of crowned) await repos.progress.markMastered(id, skillId)
  return id
}

describe('Chess Castle map (spec 016 AC7)', () => {
  it('a new chess kid starts at The board; the rest is locked', async () => {
    const { repos } = testStore()
    await chessKid(repos)
    const router = renderAt('/', repos)
    expect(await screen.findByTestId('castle')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Courtyard' })).toBeInTheDocument()
    expect(screen.getByTestId('node-chess.board')).toHaveAccessibleName(
      'Mission 1, The board, start here',
    )
    expect(screen.getByTestId('node-chess.rook')).toHaveAccessibleName(
      'Mission 2, The rook, locked',
    )

    await userEvent.click(screen.getByTestId('node-chess.rook'))
    expect(speak).toHaveBeenCalledWith('The rook. Not yet! Get a crown in the one before first.')
    await userEvent.click(screen.getByRole('button', { name: 'Play next: The board' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/chess/lesson/chess.board'))
  })

  it('crowns show, and the next skill is the one to play', async () => {
    const { repos } = testStore()
    await chessKid(repos, ['chess.board', 'chess.rook'])
    renderAt('/', repos)
    expect(await screen.findByTestId('node-chess.rook')).toHaveAccessibleName(
      'Mission 2, The rook, crowned',
    )
    expect(screen.getByTestId('node-chess.bishop')).toHaveAccessibleName(
      'Mission 3, The bishop, start here',
    )
    expect(screen.getByRole('button', { name: 'Play next: The bishop' })).toBeInTheDocument()
  })

  it('"Your first game" is coming soon', async () => {
    const { repos } = testStore()
    await chessKid(repos)
    renderAt('/', repos)
    await userEvent.click(await screen.findByTestId('node-chess-game'))
    expect(speak).toHaveBeenCalledWith('Coming soon: play a whole game against Kukoos!')
  })
})

describe('castle stickers', () => {
  it('crowning every Courtyard skill earns the Courtyard flag', () => {
    const ids = chessSkillsIn('courtyard').map((s) => s.id)
    const stats = {
      completedLessons: 1,
      perfectLessons: 0,
      firstTryAnswers: 0,
      crowned: new Set(ids),
      bossesBeaten: 0,
      streak: 0,
    }
    expect(newBadges(stats, new Set(['first-flight'])).map((b) => b.id)).toEqual([
      'chess.area.courtyard',
    ])
  })

  it('only chess learners see chess stickers in the trophy room', async () => {
    const { repos } = testStore()
    renderAt('/trophies', repos)
    await screen.findByTestId('badge-first-flight')
    expect(screen.queryByTestId('badge-chess.area.courtyard')).toBeNull()

    const chess = testStore()
    await chessKid(chess.repos)
    renderAt('/trophies', chess.repos)
    expect(await screen.findByTestId('badge-chess.area.courtyard')).toBeInTheDocument()
  })
})
