# Feature 014 — Chess Rules (pure domain)

**Status:** Approved (2026-10-20)  ·  **Constitution check:**
- §3.4 (amended): a rules engine decides every legal move, check, mate and draw; AI never decides.
- §3.2: pure domain, no React or I/O.
- §3.3: correctness is provable (perft and property tests).
- §3.7: course code loads on demand.

## Why
Every chess lesson, puzzle, bot game and pass-and-play game (F15–F17) needs the same answers: which moves are legal, whether it's check, mate or a draw, and, for a learner, **why a move isn't allowed**. Chess edge cases are easy to get wrong (castling through check, en passant, pins, promotion, stalemate), so we use a proven rules library behind our own small, kid-friendly API. That's the chess version of `solveColumns` and the misconception catalog.

## Decisions (2026-10-20)
- **Rules library: chess.js 1.4.0** (BSD-2-Clause, no dependencies, pinned exactly). It's used only inside `src/domain/chess/`, never directly by UI code.
- **Practice boards may have no kings** (for example, "move the rook to collect the stars"). chess.js supports this with validation off. On these "free boards", check and mate don't apply.

## Scope
1. **Types:** `Square` (`'a1'…'h8'`), `PieceType` (`k q r b n p`), `Color` (`w b`), `Piece`, and `ChessMove` (`from`, `to`, `san`, `piece`, `captured?`, `promotion?`, and flags: capture, castle, en passant, promotion, check).
2. **Position API** (immutable; each move returns a new position):
   - `startPosition()`, `fromFen(fen, { free? })`, `toFen(p)`.
   - `pieces(p)`: piece and square for every piece. `pieceAt(p, sq)`.
   - `turn(p)`.
   - `legalMoves(p, from?)`, `canMove(p, from, to)`, and `play(p, { from, to, promotion? })`, which returns a new position or `null`.
   - `status(p)` → `{ check, checkmate, stalemate, draw: null | 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient', over, winner }`.
3. **Why not? (learner explanations):** `explainIllegal(p, from, to)` returns one reason:
   - `not-your-turn`: it's the other side's piece;
   - `empty`: no piece on that square;
   - `not-how-it-moves`: e.g. a bishop moving straight;
   - `blocked`: a piece is in the way;
   - `own-piece`: the target holds your own piece;
   - `king-in-check`: the move ignores check;
   - `pinned`: the piece shields its king;
   - `into-check`: the king would walk into check;
   - `castle-not-allowed`.

   Each reason has a gentle, kid-facing line with the piece's name (e.g. "Bishops move diagonally ↗"), used as the hint. This is the chess misconception catalog for F18.
4. **Teaching helpers:**
   - `pieceValue` (pawn 1, knight and bishop 3, rook 5, queen 9; king not counted).
   - `material(p)`.
   - `reachable(p, from)`: the squares a piece can reach in one move, for "where can it go?" lessons.
   - `isMateInOne(p)` and `mateInOneMoves(p)`.
5. **Loads on demand:** `src/domain/chess/` is **not** exported from the `@/domain` barrel. It's imported as `@/domain/chess`, so chess.js stays out of the first-load bundle.

## Acceptance criteria
- **AC1 (dependency):** `chess.js` is pinned to `1.4.0`. Only files under `src/domain/chess/` import it, and a lint rule enforces this.
- **AC2 (correct rules):** perft from the start position gives 20 / 400 / 8,902 at depths 1–3, and the known "Kiwipete" position gives 48 / 2,039 at depths 1–2. A property test plays 200 random legal games (seeded) and checks that every position stays legal and every `play` of a listed move succeeds.
- **AC3 (special moves):** fixtures cover:
  - castling both sides, plus refusing to castle through check, out of check, after the king moved, or when blocked;
  - en passant, right away and not one move later;
  - promotion to each piece;
  - checkmate (back rank, smothered), stalemate, threefold repetition, fifty-move, and insufficient material.
- **AC4 (free boards):** `fromFen(fen, { free: true })` accepts boards without kings. `legalMoves` and `reachable` work on them, and `status` never reports check or mate.
- **AC5 (why not?):** every reason in Scope 3 has a fixture that returns it, and its kid line names the piece. `explainIllegal` returns `null` for legal moves.
- **AC6 (teaching helpers):** values and material are correct. `isMateInOne` is true on 5 known mate-in-1 positions and false on 5 near-misses, and `mateInOneMoves` returns exactly the mating moves.
- **AC7 (immutability and purity):** `play` never changes its input position. Nothing in `src/domain/chess/` imports React, Dexie, DOM or `Math.random`, and the existing purity lint covers it.
- **AC8 (not in the first load):** a build check shows chess.js isn't in the entry chunk, and `src/domain/index.ts` doesn't re-export `chess`.

## Out of scope
- The board UI, pieces and sounds (F15). Lessons and curriculum (F16). The bot (F17).
- PGN import/export and clocks.

## Open questions
None. The library choice was approved on 2026-10-20.
