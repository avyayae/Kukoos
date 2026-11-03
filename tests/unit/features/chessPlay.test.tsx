import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import type { Repositories, SavedGame } from '@/data'
import { newGame, replay } from '@/domain/chess'
import { GameOver } from '@/features/chess/play/GameOver'
import { testStore, withData } from '../withData'
import { renderAt } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
  cancelSpeech: vi.fn(),
  isSpeechSupported: () => true,
}))
vi.mock('@/audio/sfx', async (orig) => ({
  ...(await orig<typeof import('@/audio/sfx')>()),
  playSfx: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(speak).mockClear()
  vi.mocked(playSfx).mockClear()
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

async function chessKid(repos: Repositories) {
  const id = (await repos.profiles.ensureCurrent())?.id ?? ''
  await repos.profiles.update(id, { courses: ['chess'], currentCourse: 'chess' })
  return id
}

/** A saved, unfinished game against Sleepy Kukoos with the kid as White. */
async function savedGame(repos: Repositories, moves: string[]) {
  const profileId = await chessKid(repos)
  const game: SavedGame = {
    id: 'saved',
    profileId,
    opponent: 'bot:1',
    kidColor: 'w',
    startFen: START,
    moves,
    kidMoves: Math.ceil(moves.length / 2),
    result: null,
    startedAt: Date.now(),
    endedAt: null,
  }
  await repos.games.save(game)
  return profileId
}

const sq = (square: string) => screen.getByTestId(`sq-${square}`)

async function move(from: string, to: string) {
  await userEvent.click(sq(from))
  await userEvent.click(sq(to))
}

const turnText = () => screen.getByTestId('game-turn').textContent

describe('into a game (spec 017)', () => {
  it('the castle offers Play Kukoos and an open "Your first game"', async () => {
    const { repos } = testStore()
    await chessKid(repos)
    const router = renderAt('/', repos)
    const node = await screen.findByTestId('node-chess-game')
    expect(node).toHaveAccessibleName('Your first game, open')
    await userEvent.click(node)
    await waitFor(() => expect(router.state.location.search).toBe('?level=1&color=w'))
    expect(await screen.findByRole('heading', { name: /Sleepy Kukoos/ })).toBeInTheDocument()
  })

  it('setup: pick a Kukoos and a colour, then play', async () => {
    const { repos } = testStore()
    await chessKid(repos)
    renderAt('/chess/play', repos)
    expect(await screen.findByTestId('game-setup')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('level-3'))
    expect(screen.getByTestId('level-3')).toHaveAttribute('aria-checked', 'true')
    expect(speak).toHaveBeenCalledWith('Clever Kukoos. Thinks a move ahead.')
    await userEvent.click(screen.getByTestId('color-b'))
    await userEvent.click(screen.getByTestId('start-game'))
    expect(await screen.findByRole('heading', { name: /Clever Kukoos/ })).toBeInTheDocument()
    // Kukoos plays White's first move, then it's the kid's turn.
    await waitFor(() => expect(turnText()).toBe('Your turn'), { timeout: 3000 })
  })
})

describe('a game against Kukoos (spec 017 AC5)', () => {
  it('the kid moves, Kukoos thinks and replies, and every move is saved', async () => {
    const { repos, db } = testStore()
    await chessKid(repos)
    renderAt('/chess/play?level=1&color=w&seed=4', repos)
    await screen.findByTestId('game')
    expect(turnText()).toBe('Your turn')
    await move('e2', 'e4')
    expect(sq('e4')).toHaveAccessibleName(/white pawn/i)
    expect(turnText()).toBe('Kukoos is thinking…')
    expect(screen.getByTestId('game')).toHaveAttribute('data-thinking', 'true')
    await waitFor(() => expect(turnText()).toBe('Your turn'), { timeout: 3000 })
    expect(screen.getByTestId('game-announce').textContent).toMatch(/^Kukoos /)
    await waitFor(async () => expect((await db.games.toArray())[0]?.moves).toHaveLength(2))
  })

  it('take back undoes the kid’s move and Kukoos’s reply', async () => {
    const { repos } = testStore()
    await chessKid(repos)
    renderAt('/chess/play?level=2&color=w&seed=1', repos)
    await screen.findByTestId('game')
    expect(screen.getByRole('button', { name: /Take back/ })).toBeDisabled()
    await move('d2', 'd4')
    await waitFor(() => expect(turnText()).toBe('Your turn'), { timeout: 3000 })
    await userEvent.click(screen.getByRole('button', { name: /Take back/ }))
    expect(sq('d2')).toHaveAccessibleName(/white pawn/i)
    expect(sq('d4')).toHaveAccessibleName(/empty/i)
    expect(screen.getByRole('button', { name: /Take back/ })).toBeDisabled()
  })

  it('hint shows a good move', async () => {
    const { repos } = testStore()
    await savedGame(repos, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6'])
    renderAt('/chess/play', repos)
    await userEvent.click(await screen.findByTestId('resume'))
    await userEvent.click(await screen.findByRole('button', { name: /Hint/ }))
    // The mate: queen takes f7.
    await waitFor(() => expect(sq('h5')).toHaveClass('sq--hint'), { timeout: 3000 })
    expect(sq('f7')).toHaveClass('sq--hint')
    expect(speak).toHaveBeenCalledWith('Try the queen to f7.')
  })

  it('Sleepy Kukoos whispers about a piece left free to take', async () => {
    const { repos } = testStore()
    await savedGame(repos, ['e2e4', 'e7e5'])
    renderAt('/chess/play', repos)
    await userEvent.click(await screen.findByTestId('resume'))
    await move('f1', 'a6')
    const banner = await screen.findByTestId('feedback')
    expect(banner).toHaveTextContent('your bishop can be taken!')
    expect(sq('a6')).toHaveClass('sq--warn')
    // Kukoos waits while the kid decides.
    expect(screen.getByTestId('game')).not.toHaveAttribute('data-thinking')
    await userEvent.click(within(banner).getByRole('button', { name: 'Take it back' }))
    expect(sq('f1')).toHaveAccessibleName(/white bishop/i)
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  it('no whisper from a stronger Kukoos', async () => {
    const { repos } = testStore()
    const id = await savedGame(repos, ['e2e4', 'e7e5'])
    await repos.games.save({
      id: 'saved',
      profileId: id,
      opponent: 'bot:3',
      kidColor: 'w',
      startFen: START,
      moves: ['e2e4', 'e7e5'],
      kidMoves: 1,
      result: null,
      startedAt: Date.now(),
      endedAt: null,
    })
    renderAt('/chess/play', repos)
    await userEvent.click(await screen.findByTestId('resume'))
    await move('f1', 'a6')
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument()
  })

  it('end game asks first, then stops the game without a loss', async () => {
    const { repos, db } = testStore()
    await chessKid(repos)
    renderAt('/chess/play?level=1&color=w', repos)
    await screen.findByTestId('game')
    await move('e2', 'e4')
    await userEvent.click(screen.getByRole('button', { name: 'End game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.getByTestId('game')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'End game' }))
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    const over = await screen.findByTestId('game-over')
    expect(over).toHaveAttribute('data-result', 'ended')
    expect(over).toHaveTextContent('Game stopped')
    expect(over).not.toHaveTextContent(/lose|game over/i)
    await waitFor(async () => expect((await db.games.toArray())[0]?.result).toBe('ended'))
  })
})

describe('saved games (spec 017 AC7)', () => {
  it('"Keep playing your game?" restores the position', async () => {
    const { repos } = testStore()
    await savedGame(repos, ['e2e4', 'e7e5', 'g1f3'])
    renderAt('/chess/play?level=4&color=b', repos)
    expect(
      await screen.findByRole('heading', { name: 'Keep playing your game?' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('resume'))
    expect(await screen.findByRole('heading', { name: /Sleepy Kukoos/ })).toBeInTheDocument()
    expect(sq('f3')).toHaveAccessibleName(/white knight/i)
    // Black to move in the saved game: Kukoos's turn.
    expect(turnText()).toBe('Kukoos is thinking…')
  })

  it('"New game" stops the saved one and opens the setup', async () => {
    const { repos, db } = testStore()
    await savedGame(repos, ['e2e4'])
    renderAt('/chess/play', repos)
    await userEvent.click(await screen.findByTestId('new-game'))
    expect(await screen.findByTestId('game-setup')).toBeInTheDocument()
    await waitFor(async () => expect((await db.games.get('saved'))?.result).toBe('ended'))
  })
})

describe('winning "Your first game" (spec 017 AC6, AC8)', () => {
  it('a first win celebrates, earns crystals and crowns the castle node', async () => {
    const { repos } = testStore()
    await savedGame(repos, ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6'])
    const router = renderAt('/chess/play', repos)
    await userEvent.click(await screen.findByTestId('resume'))
    await move('h5', 'f7')
    const over = await screen.findByTestId('game-over', {}, { timeout: 4000 })
    expect(over).toHaveAttribute('data-result', 'win')
    expect(over).toHaveTextContent('You won your first game! Chess Castle is complete!')
    expect(within(over).getByTestId('earned')).toHaveTextContent('crystals')
    expect(playSfx).toHaveBeenCalledWith('complete')
    await userEvent.click(screen.getByTestId('back-to-castle'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByTestId('node-chess-game')).toHaveAccessibleName(
      'Your first game, crowned',
    )
  })
})

describe('game over card (spec 017 AC6)', () => {
  const show = (game: ReturnType<typeof newGame>, firstWin = false) =>
    render(
      withData(
        <MemoryRouter>
          <GameOver
            game={game}
            effects={[]}
            firstWin={firstWin}
            onPlay={vi.fn()}
            onHome={vi.fn()}
          />
        </MemoryRouter>,
      ),
    )
  const fools = ['f2f3', 'e7e5', 'g2g4', 'd8h4']

  it('a loss is a good game, with a rematch and an easier Kukoos', () => {
    const lost = replay({ level: 2, kidColor: 'w', startFen: START }, fools)
    expect(lost.result).toBe('loss')
    show(lost)
    const over = screen.getByTestId('game-over')
    expect(over).toHaveTextContent('Good game!')
    expect(over).not.toHaveTextContent(/lose|game over/i)
    expect(screen.getByTestId('rematch')).toBeInTheDocument()
    expect(screen.getByTestId('easier')).toHaveTextContent('Easier Kukoos')
    expect(playSfx).not.toHaveBeenCalled()
  })

  it('a win suggests the next Kukoos', () => {
    show(replay({ level: 2, kidColor: 'b', startFen: START }, fools))
    expect(screen.getByTestId('play-next-level')).toHaveTextContent('Play Clever Kukoos')
  })

  it('a draw says why', () => {
    const stale = replay({ level: 1, kidColor: 'w', startFen: 'k7/8/1K6/2Q5/8/8/8/8 w - - 0 1' }, [
      'c5c7',
    ])
    show(stale)
    expect(screen.getByTestId('game-over')).toHaveTextContent('Stalemate: no safe moves')
  })
})

describe('chess limit mid-game (spec 017 AC9)', () => {
  it('the game is saved and Kukoos rests until tomorrow', async () => {
    const { repos } = testStore()
    const id = await savedGame(repos, ['e2e4', 'e7e5'])
    const settings = await repos.time.settings(id)
    await repos.time.setSettings(id, { ...settings, chessLimitMin: 5 })
    await repos.time.addChess(id, 5 * 60)
    renderAt('/chess/play', repos)
    expect(await screen.findByTestId('chess-rest')).toHaveTextContent('Your game is saved!')
    expect(await repos.games.unfinished(id)).toMatchObject({ moves: ['e2e4', 'e7e5'] })
  })
})
