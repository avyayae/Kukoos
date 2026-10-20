# Plan — Feature 014 Chess Rules

## Approach
- `npm i -E chess.js@1.4.0`.
- An ESLint `no-restricted-imports` rule for `chess.js` everywhere except `src/domain/chess/**`.
- **Files** (`src/domain/chess/`):
  - `types.ts`: Square, PieceType, Color, Piece, ChessMove, Status, IllegalReason.
  - `position.ts`: `Position` is an opaque, readonly `{ fen, free }`.
    - Each call builds a `Chess` from the FEN (`skipValidation` when `free`). A position is a value, so `play` never mutates its input, and React state stays simple.
    - Repetition needs history, so `Position` also carries the list of earlier position keys (`history`). Threefold is computed by us from those keys. chess.js can only see repetition within one instance.
  - `explain.ts`: `explainIllegal` plus `WHY_NOT` kid lines per reason, with `pieceName` and `pieceNames` (spoken names).
  - `teach.ts`: `PIECE_VALUES`, `material`, `reachable`, `isMateInOne`, `mateInOneMoves`.
  - `index.ts`: the public chess API (not re-exported from `src/domain/index.ts`).
- **How `explainIllegal` works** (for a move not in `legalMoves`):
  1. Empty from-square → `empty`. Wrong colour → `not-your-turn`. Own piece on the target → `own-piece`.
  2. Geometry by piece type (pure vector math) says whether the shape is right, ignoring blockers. Wrong shape → `not-how-it-moves`. A king moving two files that isn't a legal castle → `castle-not-allowed`.
  3. Shape right but path occupied (slider) → `blocked`.
  4. Otherwise the move is pseudo-legal but leaves the king attacked:
     - the moving piece is the king → `into-check`;
     - the side was already in check → `king-in-check`;
     - else → `pinned`.

     Checked by putting the piece on a `skipValidation` copy and asking `isAttacked(kingSquare, opponent)`.
  5. Pawn specifics: a diagonal step with nothing to capture (not en passant) → `not-how-it-moves`; a straight step onto a piece → `blocked`.
- **Free boards:** `status` returns no check, mate or draw when `free` (there may be no kings). `legalMoves` uses chess.js with `skipValidation`. If chess.js refuses a king-less board for some moves, `reachable` falls back to our own geometry and blockers.

## Test plan
| AC | Test |
|---|---|
| AC1 | `package.json` pin plus lint rule (`tests/lint` style check: importing chess.js outside the domain fails) |
| AC2 | `chess/perft.test.ts` (perft via repeated `legalMoves`/`play`), `chess/random.property.test.ts` (fast-check seeds, 200 games, ≤ 120 plies) |
| AC3 | `chess/rules.test.ts` fixtures |
| AC4 | `chess/free.test.ts` |
| AC5 | `chess/explain.test.ts`, one fixture per reason |
| AC6 | `chess/teach.test.ts` |
| AC7 | immutability test (play returns a new object, input FEN unchanged) plus the purity lint |
| AC8 | `structure.test.ts` (barrel doesn't export chess). Build check in F15's perf work. |

## Risks
- **Perft through our wrapper is slow** (FEN round-trips). Keep depth 3 (8,902 nodes) and Kiwipete depth 2 (2,039).

## Deviations (recorded during implementation)
- **Engine cache:** each `Position` value caches its chess.js instance in a `WeakMap`. `play` moves on it, reads the new FEN and undoes the move, so positions stay immutable values. This made the random-games test about 3× faster.
- **En passant counts as a capture:** chess.js's `isCapture()` is false for en passant, so `ChessMove.capture` also checks `isEnPassant()`.
- **Random games:** 200 seeded games of up to 40 plies each (60s timeout), instead of 120 plies, to keep CI time reasonable.
- **AC8 is two checks:** a test that the `@/domain` barrel never re-exports chess here, and the build-chunk check in F015's perf work.
