# Plan — Feature 015 Chess Board & Pieces

## Approach
- **Files** (`src/features/chess/board/`):
  - `ChessBoard.tsx` (the board).
  - `pieces.tsx` (12 SVG pieces as one `PieceArt` component, `type` × `color`).
  - `PromotionPicker.tsx`.
  - `useBoardInput.ts` (select, tap, drag state).
  - `boardGeometry.ts` (square ↔ row/col with orientation; pure).
  - `chessSfx` entries in `src/audio/sfx.ts` (`move`, `capture`, `check`).
- **Board layout:**
  - A CSS grid of 8×8 `button`s inside `role="grid"` with `role="row"`, each square a `gridcell` containing the button.
  - Size: `--board-size: min(100vw - 2 × gutter, 100dvh - chrome, 640px)`. Squares are `size / 8`, which is ≥ 40px at 360px (360 − 32 = 328 → 41px).
  - Coordinates sit inside the edge squares (bottom row letters, left column numbers) at `--mq-text-sm`, so the board needs no extra width.
- **Tokens** (in `tokens.css` and its mirror):
  - `--mq-board-light` / `--mq-board-dark` (lavender and purple-grey), with dark-theme pairs;
  - `--mq-board-last` (sun tint), `--mq-board-target` (ink at 35%), `--mq-board-check` (danger);
  - piece fills `--mq-piece-white` / `--mq-piece-black` plus outlines.
- **Pieces:** a 45×45 viewBox each, flat shapes, with a 2.5px same-hue outline so white pieces read on light squares. Eyes are two ink dots; the smile is a short arc. Original drawings, no third-party art.
- **Input** (`useBoardInput`):
  - `selected: Square | null`.
  - **Tap:** if a piece of `movableColor` and side to move is selected → targets = `legalMoves(p, sq)`. A tap on a target → `commit`. A tap on another own piece → reselect. Anything else → deselect, or "why not" if it was a move attempt from the selected piece.
  - **Drag:** `pointerdown` on an own piece starts a drag after 6px of movement (otherwise it's a tap). A floating `PieceArt` follows the pointer (transform only). On `pointerup`, `elementFromPoint` finds the target square → `commit`, or snap back plus "why not".
  - `commit` checks for promotion (a pawn reaching the last rank with several promotion moves) → picker → `play` → `onMove`.
- **Why not:** `explainIllegal` → bubble (`role="status"`) plus `speak()` with read-aloud on, `playSfx('notYet')`, `onIllegal(reason)`, and a `shake` class on the piece.
- **Animation:** pieces are absolutely positioned layers over the grid, keyed by a stable piece id (tracked through moves by from→to), so a moved piece transitions `transform` (≤ 200ms). With reduced motion the transition is none. Captures fade out with `mq-fade` reversed.
- **Live region:** "White knight to f3", "Check!", "Checkmate! White wins", "Stalemate: it's a draw."
- **Lazy loading:**
  - `src/features/chess/ChessBoardRoute.tsx` is lazy (`React.lazy(() => import(...))`) and served at `/chess/board`, wrapped in `Suspense` with a Kukoos "loading" fallback.
  - The chess home's "Try the board" button navigates there.
  - `perf.spec.ts` additionally asserts the entry JS doesn't contain the string `chess.js`'s unique marker (`'rnbqkbnr/pppppppp'` default FEN) and that `/chess/board` fetches a chess chunk.
- **Free board screen:** header (back to Castle), the board (both sides movable), whose turn it is ("White to move" with a piece icon), and a "New game" button after game over.

## Wireframe (360px)
```
┌─────────────────────────────┐
│ ← Castle        White moves ♙│
│ ┌─────────────────────────┐ │
│ │8 ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜        │ │
│ │7 ♟ ♟ ♟ ♟ ♟ ♟ ♟ ♟        │ │
│ │  …                      │ │
│ │1 ♖ ♘ ♗ ♕ ♔ ♗ ♘ ♖        │ │
│ │  a  b  c  d  e  f  g  h │ │
│ └─────────────────────────┘ │
│  (hint bubble when needed)  │
│       [ NEW GAME ]          │
└─────────────────────────────┘
```

## States
| Square / piece | States |
|---|---|
| Square | default, last-move, selected, target (dot), capture-target (ring), check (glow + ⚠), focus-visible |
| Piece | idle, selected (lift 2px), dragging (scaled 1.1, shadow), shake (illegal), fading (captured) |
| Board | interactive, read-only, game over |

## Test plan
| AC | Test |
|---|---|
| AC1 | `chessBoard.test.tsx` (32 named pieces, flipped mapping) + `boardGeometry.test.ts`; e2e 360px size check |
| AC2, AC4, AC5, AC6 | `chessBoard.test.tsx` (taps, why-not, castle, en passant, promotion picker, check glow, game over) |
| AC3 | e2e drag (`page.mouse`) in `chess-board.spec.ts` |
| AC7 | keyboard unit test plus `a11y.spec.ts` (`/chess/board`) |
| AC8 | unit (no transition class under reduced motion) plus e2e `emulateMedia` |
| AC9 | `perf.spec.ts` |
| AC10 | `chess-board.spec.ts` |

## Deviations (recorded during implementation)
- **Pieces live inside their square buttons**, not on a separate layer. The moved piece glides with a CSS animation keyed on the move (`--from-x/--from-y` in square units), so the board stays a simple controlled component. A captured piece is covered by the arriving one rather than fading.
- **Selection and the promotion picker are keyed to the position they were made on**, so a new position clears them without an effect (the React Compiler lint rule).
- **Coordinates sit beside the square buttons** (in the grid cell), not inside them. Otherwise axe flags a label/content mismatch (WCAG 2.5.3), because "1" and "a" would be visible text missing from the name. Coordinates are ink on both square colours for AA contrast.
- **After a "why not", the piece stays selected**, so the kid can try again with one tap.
- **Escape closes the promotion picker** through a document listener: the dialog itself can't take key handlers under jsx-a11y.
- **AC9:** chess is its own chunk (`FreeBoardScreen-*.js`, about 49 KB, 17 KB gzipped, with chess.js). `perf.spec.ts` checks that no first-load script contains chess code and that `/chess/board` fetches it.
- **Board fixtures need live positions:** e.g. K+B vs K is already a draw by insufficient material, so the board (correctly) won't move.
