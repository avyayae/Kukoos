# Plan — Feature 016 Chess Curriculum & Castle Map

## Reuse first
- **Mastery, crowns and spaced review:** `applyLesson`, `isDue` and the `skillProgress` table are already generic (`SkillId` is a string). Chess skills are `chess.*`.
- **Saving:** `repos.lessons.save(state, meta)` reads only `skillId, mode, worldId, seed, startedAt, endedAt, phase, results, bestCombo`. That becomes a named structural type `SavedLesson` in `lessonSession.ts`. Both the math `LessonState` and the new `ChessLessonState` satisfy it, so lessons, attempts, progress, XP, crystals and badges are saved in one transaction as today.
  - To allow this, `QuestionResult.kind` widens to `QuestionKind | ChessPuzzleKind`, and `misconceptions` to `MisconceptionKey | ChessMistakeKey` (a template literal `chess.${string}`).
- **Celebration and rewards:** the existing `LessonComplete` flow takes the saved effects.

## Course separation (must-have)
- `report.ts` calls `getSkill`, which throws on unknown IDs. The parent report becomes **math-only**: attempts, lessons and progress are filtered to math skills. Chess comes to the dashboard in F18.
- `dueSkills` already iterates math `SKILLS` only, so the math Review never picks a chess skill.
- **Chess map and review:** `chessDue(progress, now)` and `chessUnlocked(progress)` iterate `CHESS_SKILLS` only.

## Domain (`src/domain/chess/`, pure, seeded)
- **`curriculum.ts`:** `CHESS_AREAS`, `CHESS_SKILLS` (id, title, area, kinds, intro speech, practice-board flag), `chessUnlocked`, `nextChessSkill` and `chessDue`.
- **`puzzles/types.ts`:** `Puzzle` has:
  - `id`, `skillId`, `kind`, `difficulty`, `seed` and `prompt { text, speech }`;
  - a `position` and `marks` (stars ⭐, target 🎯, piece-to-move highlight);
  - `choices?` (for `count` / `which`) and `maxMoves?`;
  - plus a pure checker.
- **`puzzles/run.ts`:** `PuzzleRun` is the in-puzzle state (position, stars left, moves used, defender replies). It handles three inputs:
  - `runMove(run, move)` → `{ run, outcome: 'solved' | 'continue' | 'wrong', hint? }`;
  - `runTap(run, square)` (`find`);
  - `runChoice(run, value)` (`count`, `which`).
- **`puzzles/generators.ts`:** one generator per skill and difficulty.
  - **Generated:** `find`, `reach`, `stars`, `count`, `capture` and `safe`, on practice boards. Generated puzzles are checked by BFS or the rules engine before they're returned, with a retry on a new seed if needed.
  - **Hand-written lists** (`puzzles/positions.ts`): `which`, `escape`, `special`, `mate1` and the mate drills. Each entry is validated in tests.
  - The mate drills (`chess.mateQK` / `chess.mateRK`) are positions with a **forced mate in 2**, verified by a 3-ply search, with a 3-move limit. The defender plays the reply that keeps the most king moves.
- **`lesson.ts`:** `ChessLessonState` and a reducer mirroring the math one:
  - 8 puzzles per lesson (decision);
  - a miss → `notYet` (retry), a second miss → `solution` (the answer shown; the puzzle is requeued at most 2 times);
  - staircase difficulty 1–3, combo, and results that satisfy `SavedLesson`.
- **Skip-ahead:** `startSkipCheck(skill, seed)` gives 3 puzzles at difficulty 3. A pass crowns the skill through `repos.progress.markMastered(profileId, skillId)`: a new data method, the same as the starting-point pre-mastery for one skill.

## UI (`src/features/chess/`, all lazily loaded)
- **`CastleMap.tsx`** (the chess home, replacing the placeholder):
  - area bands (Courtyard / Towers / Throne Room) with castle tokens;
  - nodes reuse the math `MapNode` look via the shared `.map-node` CSS and states;
  - **Play next** with the shared `PlayNextButton`, and the bottom bar (Castle / Review / Trophies / Grown-ups);
  - "Your first game" (coming soon);
  - area stickers awarded on full crowns (badges table, ids `chess.area.*`).

  It's lazily loaded with chess.js. `ChessHome` becomes a thin lazy wrapper.
- **`ChessLessonRoute.tsx`** at `/chess/lesson/:skillId` (lazy):
  - **`ChessPuzzleScreen`:** prompt with 🔊, the board with mark overlays (stars, target, highlight), choice tiles for `count` / `which`, and taps on squares for `find`.
  - **Feedback:** the shared `FeedbackBanner` and the progress bar.
  - **End:** `LessonComplete`.
- **`SkipAheadOffer`:** shown on a skill's first open (no progress row yet), with "Show Kukoos!" and "Teach me" buttons.
- **`ChessBoard`** gains `marks` and a `tapOnly` mode (for `find`: every square is tappable and nothing moves).

## Launch
- `chessAvailable()` returns true: the gate is removed and the `VITE_CHESS` variable deleted (`.env.e2e` and the e2e env).
- The "Try the board" button is removed. `/chess/board` stays as an unlisted route (for F17).
- Tests that stubbed `VITE_CHESS=''` for the "math-only build" now check that onboarding offers both courses. The "single-course build" branch stays covered by a unit test of `availableCourses({ chess: false })`.

## Test plan
| AC | Test |
|---|---|
| AC1 | `chess/curriculum.test.ts` (IDs match the skill-map doc, parsed from `specs/05-chess-skill-map.md`) |
| AC2 | `chess/puzzles.property.test.ts` (skill × difficulty × seeds; checkers accept exactly the engine's answers; stars solvable) |
| AC3 | `chess/positions.test.ts` (mate-in-1 list, mate-in-2 drills by search, `which` labels match `status`) |
| AC4 | `chess/lesson.test.ts` (reducer) and `chessLesson.test.tsx` (screen) |
| AC5 | `data/chessProgress.test.ts` (save → mastery, unlock order, math untouched, report math-only) |
| AC6 | `chessLesson.test.tsx` skip-ahead pass and fail |
| AC7 | `castleMap.test.tsx` |
| AC8 | `chessLesson.test.tsx` (illegal knight move → attempt misconception) |
| AC9 | `courses.test.tsx` updated, `perf.spec.ts` |
| AC10 | `chess-course.spec.ts` |

## Risks
- **Scope:** this is the biggest feature since F05. Tasks are ordered so the domain is fully tested before any UI.
- **Puzzle quality:** generated positions must look sensible to a kid. Practice boards stay sparse (1 piece, ≤ 3 stars, ≤ 2 blockers).

## Deviations (recorded during implementation)
- **Illegal attempts don't count as misses.** The board already explains them (shake plus a spoken "why not"), so the lesson records them only as mistake patterns (`chess.<reason>:<piece>`). Only legal-but-wrong answers use up the two tries. This matches §1.2 "no shame" and lets kids explore.
- **The castle map ships in the main bundle**, not lazily. `curriculum.ts` has no chess.js and no positions, so the map costs only a few KB. Lessons (generators, positions, rules) and the board stay lazy: `ChessLessonRoute` is about 24 KB (8.6 KB gzipped), and `perf.spec.ts` still finds no chess rules in the first load.
- **Area stickers are badges** with a new `crownAll` rule, so the existing lesson-save flow awards and celebrates them. The trophy room shows them only to kids who learn chess. A sticker earned through a skip-ahead crown is awarded at the next saved lesson.
- **The skip-ahead check isn't saved as a lesson** (no XP). Passing it calls `progress.markMastered`, using the same `preMastered` rule as the math starting point.
- **Puzzle generator tests** use 25 seeds per skill × kind × difficulty for generated boards and 6 for list-based kinds, not 200. Every generated puzzle is still checked against the engine, and the stars search uses fast geometry (tested equal to the engine on practice boards).
- **Mate drills:** a search found the forced mate-in-2 positions. Its first version also accepted some mate-in-1 positions; the test caught that, and those were removed (4 queen and 5 rook drills remain).
- **`nextAnswer` (solver)** powers both "show the answer" after two misses (💡 squares) and the tests that play whole lessons.
- **The parent report is math-only** (`mathOnly` filter at the top of `parentReport`): chess rows used to crash `getSkill`. Chess joins the dashboard in F18.
- **Launch:** the `VITE_CHESS` flag and its single-course branches were removed (decision: live when F16 merges). `/chess/board` stays reachable but unlisted, for F17.
- **No check glow in "which" puzzles:** found in the 360px visual check. The board's check glow and ⚠ gave away the answer to "Is the king in check?", so `ChessBoard` gained `showCheck`, and it's off for `which` puzzles (tested).
