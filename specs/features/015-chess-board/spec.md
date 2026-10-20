# Feature 015 — Chess Board & Pieces

**Status:** Approved (2026-10-20)  ·  **Constitution check:**
- §1.2: no shame. An illegal move gets a gentle shake and a "why not" hint, never a red X.
- §1.4: tap-first, every square and piece has a spoken name.
- §2.4: one piece on an empty board first.
- §3.7: the board and chess.js load only when chess opens; AA contrast; reduced motion.

## Why
Every chess activity (lessons in F16, puzzles, bot and pass-and-play games in F17) happens on one board. A kid aged 5 and up must be able to:
- see whose turn it is and where a piece can go;
- move with a tap;
- understand why a move didn't work;

all without reading. The pieces must look like real chess pieces so the skills carry over to a real board, with friendly faces in the Kukoos style (decision 2026-10-19).

## Scope
1. **`<ChessBoard>`** (`src/features/chess/board/`), driven by an F14 position:
   - **Layout:** 8×8, sized to fit a 360px phone with 16px gutters and up to tablet width. Squares are at least 40px on a 360px phone.
   - **Coordinates:** a–h and 1–8 along the edges.
   - **Orientation:** White at the bottom by default. A `flipped` prop exists for F17.
2. **Pieces:** an original SVG set, 6 types × 2 colours, as React components.
   - **Look:** classic silhouettes with small friendly eyes and a smile. Colours come from new board tokens with AA contrast in light and dark themes.
   - **Accessible names:** each piece has one (e.g. "White knight on g1").
3. **Moving (tap-first):**
   - Tap a piece of the side to move to select it. Its legal targets show as dots, and captures as rings.
   - Tap a target to move, or tap elsewhere or the same piece to deselect.
   - **Drag-and-drop** works too (pointer events), with the same rules.
   - Props: `interactive`, `movableColor` (`w`, `b` or `both`), and `onMove(move)`.
4. **Illegal attempts:**
   - The piece does a gentle shake (`mq-shake`), plus the `notYet` sound.
   - The F14 "why not" line appears in a small bubble and is spoken (e.g. "Bishops move diagonally").
   - `onIllegal(reason)` reports the reason to the lesson (for F16 hints and F18 mistake patterns).
5. **Feedback:**
   - Highlights: last move (tint), selected square (outline), king in check (glow plus a ⚠ icon, never colour alone).
   - **Sounds:** synthesized `move`, `capture` and `check` (Web Audio, like today's sfx).
   - Promotion opens a picker with four big tiles (queen, rook, bishop, knight), spoken names, and queen first.
6. **Motion:** the piece glides to its square (≤ 200ms, `springs.gentle`), and a captured piece fades. With reduced motion, the move is instant and the capture is an opacity fade of ≤ 150ms.
7. **Keyboard and screen readers:**
   - The board is a `grid`, and arrow keys move focus between squares.
   - Enter or Space selects and moves.
   - Each square says what's on it and whether it's a legal target.
   - Every move is announced in a live region ("Knight to f3").
8. **Loads on demand:** the chess home loads the board with `React.lazy` (its own chunk with chess.js). First-visit bytes and the entry chunk don't grow.
9. **Free board (temporary):** while chess is still hidden (until F16), the Chess Castle placeholder gets a **"Try the board"** button. It opens `/chess/board`, a free board where both sides can move. It's used for e2e and for trying the pieces, and it gets replaced in F16/F17.

## Acceptance criteria
- **AC1 (render):** the start position renders 32 pieces with correct names and squares. Flipped orientation puts a1 at the top right. It fits 360×740 with no horizontal scroll, and squares are ≥ 40px there.
- **AC2 (tap to move):** tapping a white knight on g1 shows exactly f3 and h3 as targets. Tapping f3 calls `onMove` with the move, and the knight shows on f3. Tapping the knight again deselects it.
- **AC3 (drag):** dragging a piece to a legal square moves it. Dropping on an illegal square snaps it back with the shake and the reason.
- **AC4 (why not):** tapping a bishop, then a square straight ahead, shows and speaks the "diagonally" line, and calls `onIllegal('not-how-it-moves')`. Nothing moves.
- **AC5 (special moves):** castling by tapping the king and then g1 moves both king and rook. En passant removes the right pawn. Promotion shows the picker, and the chosen piece appears.
- **AC6 (check and end):** a king in check shows the glow plus ⚠ and plays `check`. Checkmate and stalemate call `onGameOver(status)`.
- **AC7 (a11y):** keyboard-only play can make a full legal move. Axe reports no serious or critical issues on `/chess/board`, and every piece and square has a name.
- **AC8 (reduced motion):** with `prefers-reduced-motion`, moves are instant (no transform transition) and captures fade.
- **AC9 (performance):** the entry chunk doesn't contain chess.js or the board. `perf.spec.ts` still passes (< 2 MB), and opening `/chess/board` loads the chess chunk.
- **AC10 (E2E):** on `/chess/board`, play 1.e4 e5 2.Nf3 by taps, try one illegal move (its hint shows), and play a quick mate (Scholar's mate). The game-over state shows.

## UX notes
- **Square colours:** soft lavender light squares and purple-grey dark squares (tokens `--mq-board-light` / `--mq-board-dark`), not the brand primary, so highlights stand out. The dark theme gets its own pair.
- **Highlights:** last move = sun-yellow tint, selected = primary outline, targets = ink dots at 35% opacity, capture = ring, check = danger glow plus ⚠.
- **Faces:** two dot eyes and a small smile on the upper body of each piece, same on both colours. The king has a tiny crown, and the knight is a horse head with an eye. No faces on squares or coordinates.
- **Hint bubble:** Kukoos-style speech bubble above the board, ≤ 8 words, auto-hides after 3s or the next tap.

## Out of scope
- Lessons, stars or puzzle goals on the board (F16). The bot, pass-and-play screen, flipping per turn and game history (F17).
- Board themes and piece sets beyond the one (later, maybe as earned items).

## Decisions (2026-10-20)
- **Tap and drag:** both move pieces, with the same rules and hints.
- **Coordinates always on** (a–h, 1–8 along the edges).
- **Kukoos lavender board:** soft lavender and purple-grey squares.
