# Plan — Feature 017 Chess Play: Games vs Kukoos

## Reuse first
- **Rules:** `startPosition`, `fromFen`, `play`, `status`, `legalMoves`, `whyNot` and `attackersOf` (F14). Threefold uses `Position.seen`.
- **Board:** `ChessBoard` (F15) already has `movable`, `lastMove`, `hint`, `marks`, `showCheck` and `onGameOver`. It gains nothing new except a `disabled`-while-thinking use of `movable: 'none'`.
- **Celebration:** the reward moments from `LessonComplete` (`momentFor`, sounds and the order of effects) are reused through a small `RewardMoments` component, split out of `LessonComplete` so both screens share it.
- **Time:** `useActivity('chess')` counts game time. While Kukoos thinks, the screen sets the activity to `null`. `time.chess.locked` triggers the save-and-pause.
- **Kukoos:** the existing moods (`think`, `cheer`, `encourage`, `sleep`) and `useSpeakOnTap` / read-aloud.

## Domain (pure, `src/domain/chess/`, seeded)
- **`bot/search.ts`:** negamax with alpha-beta on a private chess.js instance (`new Chess(fen)`), using **non-verbose** `moves()` plus `move(san)` / `undo()`. Verbose move lists are about 1 ms each and are never used in search.
  - Move ordering: captures first (most valuable victim, least valuable attacker), then checks.
  - Quiescence on captures only, at level 2 and above, with a capped depth.
  - Mate scores prefer the quickest mate. A stalemate scores 0, which is bad when ahead, so a winning bot avoids it.
- **`bot/evaluate.ts`:** material (`PIECE_VALUES`) plus small piece-square tables (centre for knights and pawns, king safety in the middlegame, king centralisation when few pieces are left).
- **`bot/levels.ts`:** `BOT_LEVELS[1..4]` holds name, mood, description, depth, quiescence on or off, slip rate and slip margin.
  - A **slip** happens with the level's probability (seeded). The bot then picks a random move among those scoring within the slip margin of the best, or, at level 1, any move that isn't an instant mate-in-1 blunder for the bot.
  - Level 3 and level 4 never slip past an available mate in 1.
- **`bot/index.ts`:** `chooseMove(position, level, seed) → MoveInput` and `bestMove(position, depth) → MoveInput` (for **Hint**). Both are deterministic for the same inputs.
- **`game.ts`:** `GameState` holds start FEN, moves (UCI), the current `Position`, kid colour, opponent and result. It has pure reducers:
  - `applyMove`;
  - `takeBack`, which undoes the kid's move and the bot's reply by replaying from the start, so `seen` stays right for threefold;
  - `endGame`;
  - `resultOf(status, kidColour)`.
  
  `fromSaved(row)` rebuilds the state by replaying the UCI list.
- **`whisper.ts`:** `hangingPieces(position, colour)` finds the kid's pieces attacked by a cheaper piece, or attacked and undefended, using `attackersOf`. Only the newly hanging piece after the kid's move counts.
- **`gamification/gameRewards.ts`:** `gameRewards({ result, kidMoves, level, firstWinAtLevel, wallet }) → { wallet, effects }`.
  - XP 15 for a finished game with ≥ 10 kid moves, +15 for a win.
  - Crystals 10 on the first win at a level.
  - A `levelUp` effect when the level changes.
  - No streak, goal or badge work: chess is open play, and badges come in F18.

## Bot worker
- **`src/features/chess/play/bot.worker.ts`:** `onmessage({ fen, seen, level, seed, kind: 'move' | 'hint' })` → `postMessage({ move })`. It imports `@/domain/chess/bot`.
- **`botClient.ts`:** creates `new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' })` lazily. When `Worker` is missing (jsdom unit tests), it runs the same function on the main thread after a timeout. It enforces the ~0.6 s minimum "thinking" pause, and cancels a stale request when the kid takes back or leaves.

## Data
- **`games` table:** Dexie **schema v2** with `games: 'id, profileId, [profileId+endedAt]'`. The upgrade adds only the new table, so no existing rows change.
- **`GameRow extends SyncFields`:** `opponent` (`bot:1`–`bot:4`), `kidColor`, `startFen`, `moves: string[]`, `result: GameResult | null`, `startedAt`, `endedAt: number | null`, `kidMoves`.
- **`repos.games`:**
  - `unfinished(profileId)`;
  - `saveProgress(row)`, an upsert on every move;
  - `finish(id, result, at) → RewardEffect[]`, which is idempotent, writes the wallet and the outbox in one transaction, and computes `firstWinAtLevel` from earlier rows;
  - `wins(profileId) → Set<level>` (used for the castle crown and the next-level suggestion).
- **Backup:** `games` joins `SYNC_TABLES`. Export and import carry it, and import still accepts v1 files (no `games` key means empty).
- **Profile remove and reset** also clear that kid's games.
- **Null repo:** an in-memory `games`.

## UI (`src/features/chess/play/`, lazy)
- **`/chess/play` route (`ChessPlayGate`):**
  - **Setup sheet** (`GameSetup`): 4 level cards and the colour toggle. Read-aloud on tap.
  - If an unfinished game exists, show **"Keep playing your game?"** first.
  - `?level=1&color=w` (from the castle node) skips the setup.
- **`GameScreen`:**
  - the board, a turn banner, Kukoos with the `think` mood while thinking, and the captured-pieces strips;
  - **Take back**, **Hint** (💡 squares from `bestMove`, depth 3) and **End game** (confirm dialog);
  - the whisper (level 1) uses `marks` on the hanging piece and speaks the line;
  - bot moves animate with the existing glide and are announced in the live region and by read-aloud.
- **`GameOver`:** win, "Good game!" or a draw explanation, then `RewardMoments`, then the end buttons.
  - A first win plays "You won your first game! Chess Castle is complete!".
  - After a win at a level below 4, Kukoos suggests the next level.
- **Limit:** the screen watches `time.chess.locked`. When it turns true, it saves the game and shows `ChessRest` with the extra line "Your game is saved!".
- **Chess home:**
  - a **Play** chip in the dock next to Play next ("♟️ Play Kukoos"). When every skill is crowned, it becomes the main button in place of the current "coming soon" text;
  - the castle node "Your first game" opens `/chess/play?level=1&color=w`, and shows 👑 once `wins` is not empty. `comingSoon` copy is removed.

## Test plan
| AC | Test |
|---|---|
| AC1 | `chess/bot.test.ts` (legal, deterministic, game over) |
| AC2 | `chess/bot.strength.test.ts` (seeded matches, run in the `slow` group so normal `npm test` stays fast enough) |
| AC3 | `chess/bot.test.ts` (mate-in-1 list for levels 3–4, level 1 blunders, no stalemate when mate is there) |
| AC4 | `chess/bot.perf.test.ts` (50 middlegames, level 4 ≤ 1.5 s each) and the e2e board-responsive check |
| AC5 | `chess/game.test.ts` (take back, replay), `whisper.test.ts`, `gameScreen.test.tsx` |
| AC6 | `gameRewards.test.ts`, `gameOver.test.tsx` |
| AC7 | `data/games.test.ts` (save, resume, finish idempotent), `db.migration.test.ts` (v1 → v2), backup round trip |
| AC8 | `castleMap.test.tsx` (node crowned after a win) |
| AC9 | `gameScreen.test.tsx` (thinking doesn't count, limit pause) |
| AC10 | `perf.spec.ts` (no bot code in the first load) |
| AC11 | `chess-play.spec.ts` |

## Risks
- **Bot speed in chess.js:** depth 3 plus quiescence can be slow in the opening and middlegame. Mitigations: move ordering, capped quiescence, a node budget per move (stop and return the best so far), and the worker. AC4 sets the bar.
- **Strength tests are slow and statistical.** They're seeded so they're repeatable, and kept to 40 games per pairing with a 150-move cap (a capped game counts as a draw).
- **Schema v2** is the first migration. It gets an explicit migration test, and backup import must still accept v1 files.

## Deviations (recorded during implementation)
- (none yet)
