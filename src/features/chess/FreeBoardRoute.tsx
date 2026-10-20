import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router'
import { chessAvailable } from '@/app/courses'
import { Kukoos } from '@/ui'

// Chess (with chess.js) loads only when it's opened (spec 015 AC9, constitution §3.7).
// Nothing else may import the board or @/domain/chess statically.
const FreeBoardScreen = lazy(() => import('./FreeBoardScreen'))
const ChessLessonRoute = lazy(() => import('./lesson/ChessLessonRoute'))

function ChessLoading() {
  return (
    <main className="screen chess-loading" aria-busy="true">
      <Kukoos mood="think" size={96} talks>
        <span>Setting up the board…</span>
      </Kukoos>
    </main>
  )
}

/** /chess/board: only in builds that offer chess. */
export function FreeBoardRoute() {
  if (!chessAvailable()) return <Navigate to="/" replace />
  return (
    <Suspense fallback={<ChessLoading />}>
      <FreeBoardScreen />
    </Suspense>
  )
}

/** /chess/lesson/:skillId (spec 016), loaded on demand with the rules. */
export function ChessLessonGate() {
  if (!chessAvailable()) return <Navigate to="/" replace />
  return (
    <Suspense fallback={<ChessLoading />}>
      <ChessLessonRoute />
    </Suspense>
  )
}
