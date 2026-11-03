import { useState } from 'react'
import { Link } from 'react-router'
import { useActivity } from '@/app/time'
import { type ChessStatus, type Square, startPosition, turn } from '@/domain/chess'
import { Button3D } from '@/ui'
import { ChessBoard } from './board/ChessBoard'
import { COLOR_NAMES } from './board/geometry'
import { PieceArt } from './board/PieceArt'

interface Game {
  position: ReturnType<typeof startPosition>
  last: { from: Square; to: Square } | null
  over: ChessStatus | null
}

const newGame = (): Game => ({ position: startPosition(), last: null, over: null })

function endLine(st: ChessStatus): string {
  if (st.checkmate && st.winner) return `Checkmate! ${COLOR_NAMES[st.winner]} wins.`
  if (st.draw === 'stalemate') return 'Stalemate! It’s a draw.'
  return 'It’s a draw.'
}

/**
 * A free board where both sides move (spec 015, temporary until F16/F17): try the pieces,
 * or play a friend on one tablet. Loaded on demand with chess.js.
 */
export default function FreeBoardScreen() {
  useActivity('chess')
  const [game, setGame] = useState<Game>(newGame)
  const toMove = turn(game.position)

  return (
    <main className="screen free-board" data-testid="free-board">
      <header className="free-board__header">
        <Link
          to="/"
          className="btn3d btn3d--ghost btn3d--lg icon-btn"
          aria-label="Back to Chess Castle"
        >
          ←
        </Link>
        <h1 className="free-board__title">Free board</h1>
        <p className="free-board__turn" data-testid="turn">
          <span className="free-board__turn-piece" aria-hidden="true">
            <PieceArt type="k" color={toMove} />
          </span>
          {COLOR_NAMES[toMove]} to move
        </p>
      </header>
      <ChessBoard
        position={game.position}
        lastMove={game.last}
        movable={game.over ? 'none' : 'both'}
        onMove={({ move, position }) =>
          setGame({ position, last: { from: move.from, to: move.to }, over: null })
        }
        onGameOver={(st) => setGame((g) => ({ ...g, over: st }))}
      />
      {game.over && (
        <div className="free-board__over">
          <p className="free-board__end" data-testid="game-over">
            {endLine(game.over)}
          </p>
          <Button3D variant="primary" size="xl" onClick={() => setGame(newGame())}>
            New game
          </Button3D>
        </div>
      )}
    </main>
  )
}
