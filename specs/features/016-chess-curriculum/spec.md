# Feature 016 — Chess Curriculum & Castle Map

**Status:** Approved (2026-10-20)  ·  **Constitution check:**
- §2.1: mastery unlocks the next skill.
- §2.2: spaced review.
- §2.3: about 80% success.
- §2.4: practice board → real positions.
- §2.5 (amended): every skill is in `specs/05-chess-skill-map.md`.
- §3.3 and §3.4: puzzles come from seeded generators or validated lists, and the rules engine decides every answer.
- §1.2: no shame (gentle "why not" hints, retries).
- §1.3: chess is open play (no goal, no streak).
- §3.7: chess still loads on demand.

## Why
F13–F15 built the course frame, the rules and the board. A kid who picks Chess still sees "Chess Castle is being built". F16 delivers what they came for: **lessons that teach chess from the first square to checkmate**, on a castle map, with the same mastery, rewards and gentle feedback as math. With F16, **chess goes live** (`VITE_CHESS` is no longer needed). The only missing piece is "play a full game", which F17 adds.

## Scope
1. **Skill map:** `specs/05-chess-skill-map.md` (18 skills in 3 areas, 10 puzzle kinds). It becomes the chess curriculum in `src/domain/chess/curriculum.ts` (skills, areas, order, puzzle kinds per skill).
2. **Puzzle generators** (pure, seeded, `src/domain/chess/puzzles/`):
   - Each skill generates puzzles at difficulty 1–3 (e.g. rook stars: 1 star → 3 stars with blockers).
   - Hand-written lists cover positions that can't be generated well (mate in 1, the mate drills), and tests validate every entry against the rules engine.
   - Each puzzle carries its prompt, its speech line and its "correct when" rule (see the skill map).
3. **Chess lessons:** a lesson is **8 puzzles** (same as math).
   - The move (or tap) is the answer: a correct move gets the success banner and sound.
   - A wrong move gets the F15 "why not" hint (illegal), or a puzzle-specific hint ("That square can be taken: try another!"), plus a retry. A second miss shows the answer move highlighted and the puzzle comes back later, like math.
   - Progress bar, Kukoos moods and the end-of-lesson celebration (XP, crystals) are shared with math.
4. **Mastery and review:** chess skills use the existing mastery, crowns and spaced-review model, stored per kid in the same tables (`skillId` = `chess.*`). The chess "Review" button returns, showing due chess skills.
5. **Skip-ahead check:** the first time a skill opens, "Already know this? Show Kukoos!" offers 3 harder puzzles. All 3 right on the first try crowns the skill (`preMastered`) and opens the next one. Either way it ends kindly: "You know this already!" or "Let's learn it together!". The offer can be skipped.
6. **Castle map** (the chess home):
   - A vertical path of the 18 skills through Courtyard → Towers → Throne Room, using the math map's node look (locked, current, crowned) and its **Play next** button.
   - An area sticker is earned when an area is fully crowned.
   - The last node, "Your first game", shows "Coming soon" until F17.
7. **Mistake patterns saved:** illegal attempts are saved with `chess.<reason>[:piece]` keys (spec 014) on attempt rows, ready for the F18 dashboard.
8. **Launch:** remove the `VITE_CHESS` gate (chess is available in production), and remove the temporary "Try the board" button. The free board stays reachable for now as a hidden `/chess/board` route until F17's pass-and-play replaces it.

## Acceptance criteria
- **AC1 (curriculum):** the 18 skills, 3 areas and order match `05-chess-skill-map.md`. Each skill lists its puzzle kinds, and a test checks the doc and the code agree on IDs.
- **AC2 (generators):**
  - For every skill × difficulty × 200 seeds, the puzzle is solvable, and its answer checker accepts exactly the right moves (verified with the rules engine).
  - Positions are legal (practice boards may omit kings).
  - Each `stars` puzzle can be solved within its move limit (by search).
- **AC3 (hand-written lists):** every mate-in-1 entry is mate in exactly one, with ≥ 1 mating move and no stalemate. The mate drills (Q+K, R+K) can be mated within their limit against the defender.
- **AC4 (lesson):** a chess lesson plays 8 puzzles:
  - correct → banner, `correct` sound, progress;
  - illegal → the why-not hint and `notYet`;
  - legal but wrong → the puzzle hint;
  - a second miss → answer shown, and the puzzle is retried later.

  It ends with the shared celebration and saves the lesson and attempts.
- **AC5 (mastery and review):** crowns and review work for `chess.*` skills, the next skill unlocks only after mastery, and math progress is untouched.
- **AC6 (skip-ahead):** 3/3 crowns the skill and unlocks the next. 2/3 or less starts the normal lesson with no penalty. "Skip" goes straight to the lesson.
- **AC7 (castle map):** the path shows areas and nodes with correct states, and **Play next** opens the next skill. Area stickers are awarded once. "Your first game" says "Coming soon".
- **AC8 (mistake patterns):** a knight moved like a bishop in a lesson saves `chess.not-how-it-moves:n` on that attempt.
- **AC9 (launch):** with no `VITE_CHESS`, onboarding offers Math and Chess and the switcher works. The first-load budget (< 2 MB) still holds, and chess code still loads only on the chess home.
- **AC10 (E2E):** a fresh chess-only kid:
  - plays the `chess.board` lesson (find squares) to the celebration;
  - opens `chess.rook`, passes the skip-ahead check, and sees it crowned and `chess.bishop` unlocked;
  - makes a deliberate knight mistake that's recorded.

## UX notes
- **Puzzle screen:** the prompt (≤ 8 words, 🔊) above the board. The board takes the most room. Stars ⭐ and targets 🎯 sit on squares as overlays (not pieces), and the move counter is for `stars` only.
- **No timers** anywhere in chess (§1.3).
- **Hints name the piece and the idea:** "The rook can't jump. Go around!", "That square is watched by the bishop."
- **Castle map:** same node component and motion as the math map (current-node pulse, scroll-to-current, unlock pop), with castle colours (stone, banners) from new map tokens.

## Out of scope
- Bot games, pass-and-play and "Your first game" (F17). Chess badges and the chess dashboard (F18).
- Openings and tactics beyond mate in 1 (Phase 2).

## Decisions (2026-10-20)
- **8 puzzles per lesson**, the same as math.
- **Chess goes live for everyone when F16 merges.** "Your first game" shows "Coming soon" until F17.
