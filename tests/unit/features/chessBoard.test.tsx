import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playSfx } from '@/audio/sfx'
import { speak } from '@/audio/tts'
import {
  type ChessStatus,
  fromFen,
  type IllegalReason,
  type Position,
  type Square,
  startPosition,
} from '@/domain/chess'
import { ChessBoard } from '@/features/chess/board/ChessBoard'
import { squareAt } from '@/features/chess/board/geometry'
import { withData } from '../withData'
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

const onIllegal = vi.fn<(reason: IllegalReason) => void>()
const onGameOver = vi.fn<(status: ChessStatus) => void>()

function Harness({ start, flipped = false }: { start: Position; flipped?: boolean }) {
  const [position, setPosition] = useState(start)
  const [last, setLast] = useState<{ from: Square; to: Square } | null>(null)
  return (
    <ChessBoard
      position={position}
      lastMove={last}
      flipped={flipped}
      onIllegal={onIllegal}
      onGameOver={onGameOver}
      onMove={({ move, position: next }) => {
        setPosition(next)
        setLast({ from: move.from, to: move.to })
      }}
    />
  )
}

const board = (start: Position = startPosition(), flipped = false) =>
  render(withData(<Harness start={start} flipped={flipped} />))
const sq = (name: string) => screen.getByTestId(`sq-${name}`)
const tapSq = (name: string) => userEvent.click(sq(name))

beforeEach(() => {
  vi.mocked(speak).mockClear()
  vi.mocked(playSfx).mockClear()
  onIllegal.mockClear()
  onGameOver.mockClear()
})

describe('render (spec 015 AC1)', () => {
  it('draws the start position with 32 named pieces and coordinates', () => {
    board()
    expect(screen.getByRole('grid', { name: 'Chess board. White to move.' })).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell')).toHaveLength(64)
    expect(document.querySelectorAll('[data-piece]')).toHaveLength(32)
    expect(sq('g1')).toHaveAccessibleName('g1, White knight')
    expect(sq('e8')).toHaveAccessibleName('e8, Black king')
    expect(sq('e4')).toHaveAccessibleName('e4, empty')
    expect(sq('a1').parentElement).toHaveTextContent('1')
    expect(sq('a1').parentElement).toHaveTextContent('a')
  })

  it('flipped puts a1 at the top right', () => {
    expect(squareAt(0, 7, true)).toBe('a1')
    expect(squareAt(7, 0, false)).toBe('a1')
    board(startPosition(), true)
    const firstRow = screen.getAllByRole('row')[0]
    const cells = within(firstRow as HTMLElement).getAllByRole('button')
    expect(cells.at(-1)).toHaveAccessibleName('a1, White rook')
  })
})

describe('tap to move (AC2)', () => {
  it('shows exactly the legal targets, moves, and deselects', async () => {
    board()
    await tapSq('g1')
    expect(speak).toHaveBeenCalledWith('White knight')
    const targets = screen.getAllByRole('button', { name: /can move here/ })
    expect(targets.map((t) => t.dataset.square).sort()).toEqual(['f3', 'h3'])

    await tapSq('g1')
    expect(screen.queryAllByRole('button', { name: /can move here/ })).toHaveLength(0)

    await tapSq('g1')
    await tapSq('f3')
    expect(sq('f3')).toHaveAccessibleName('f3, White knight')
    expect(screen.getByTestId('chess-announce')).toHaveTextContent('White knight to f3.')
    expect(playSfx).toHaveBeenCalledWith('move')
    expect(screen.getByRole('grid')).toHaveAccessibleName('Chess board. Black to move.')
  })
})

describe('why not? (AC4)', () => {
  it('a bishop moving straight gets the diagonal hint and nothing moves', async () => {
    board(fromFen('4k3/p7/8/8/8/8/8/2B1K3 w - - 0 1'))
    await tapSq('c1')
    await tapSq('c4')
    expect(screen.getByRole('status')).toHaveTextContent('The bishop moves diagonally.')
    expect(speak).toHaveBeenCalledWith('The bishop moves diagonally.')
    expect(onIllegal).toHaveBeenCalledWith('not-how-it-moves')
    expect(playSfx).toHaveBeenCalledWith('notYet')
    expect(sq('c1')).toHaveAccessibleName(/White bishop/)
    expect(sq('c4')).toHaveAccessibleName(/empty/)
  })
})

describe('special moves (AC5)', () => {
  it('castling moves king and rook', async () => {
    board(fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'))
    await tapSq('e1')
    await tapSq('g1')
    expect(sq('g1')).toHaveAccessibleName('g1, White king')
    expect(sq('f1')).toHaveAccessibleName('f1, White rook')
    expect(screen.getByTestId('chess-announce')).toHaveTextContent('White castles.')
  })

  it('en passant removes the passed pawn', async () => {
    board(fromFen('rnbqkbnr/1pp1pppp/p7/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3'))
    await tapSq('e5')
    expect(sq('d6')).toHaveAccessibleName(/can capture/)
    await tapSq('d6')
    expect(sq('d6')).toHaveAccessibleName('d6, White pawn')
    expect(sq('d5')).toHaveAccessibleName('d5, empty')
    expect(playSfx).toHaveBeenCalledWith('capture')
  })

  it('promotion asks for the new piece', async () => {
    board(fromFen('8/P6k/8/8/8/8/8/K7 w - - 0 1'))
    await tapSq('a7')
    await tapSq('a8')
    const dialog = screen.getByRole('dialog', { name: 'Choose a new piece!' })
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Queen', 'Rook', 'Bishop', 'Knight'])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Knight' }))
    expect(sq('a8')).toHaveAccessibleName('a8, White knight')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('check and game over (AC6)', () => {
  it('a king in check glows with ⚠ and the move plays the check sound', async () => {
    board(fromFen('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'))
    await tapSq('a1')
    await tapSq('a8')
    expect(playSfx).toHaveBeenCalledWith('check')
    expect(sq('e8')).toHaveAccessibleName('e8, Black king, in check')
    expect(sq('e8')).toHaveTextContent('⚠')
  })

  it('checkmate ends the game', async () => {
    board(fromFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'))
    await tapSq('a1')
    await tapSq('a8')
    expect(onGameOver).toHaveBeenCalledWith(
      expect.objectContaining({ checkmate: true, winner: 'w' }),
    )
    expect(screen.getByTestId('chess-announce')).toHaveTextContent('Checkmate! White wins.')
  })
})

describe('keyboard (AC7)', () => {
  it('arrow keys and Enter play Nf3', async () => {
    board()
    sq('a1').focus()
    await userEvent.keyboard('{ArrowRight>6/}')
    expect(sq('g1')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}')
    expect(sq('f3')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(sq('f3')).toHaveAccessibleName('f3, White knight')
  })
})

describe('free board route (AC9)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('loads the board on demand when chess is offered', async () => {
    vi.stubEnv('VITE_CHESS', '1')
    renderAt('/chess/board')
    expect(await screen.findByTestId('free-board')).toBeInTheDocument()
    expect(screen.getByTestId('turn')).toHaveTextContent('White to move')
  })

  it('without chess it goes home', async () => {
    vi.stubEnv('VITE_CHESS', '')
    const router = renderAt('/chess/board')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})
