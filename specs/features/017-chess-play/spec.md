# Feature 017 — Chess Play: Games vs Kukoos

**Status:** Approved (2026-11-03)  ·  **Constitution check:**
- §1.2: no shame. A lost game is "Good game!", never "game over". There are no lives and no penalties for resigning.
- §1.3: chess is open play, with no clocks or timers in games and no "come back" nudges. The optional chess daily limit (F13) is respected.
- §1.1: rewards come only from finished games (real play).
- §2.3: bot levels aim at a game the kid can win, and the next level is suggested after a win.
- §2.4: this is the "full games" step of concrete → abstract.
- §3.4: the bot is code. It picks moves with a seeded search on the F14 rules engine, and no AI picks or judges moves.
- §3.5: saved games are records with `id`, `profileId`, `updatedAt`, `version`.
- §3.7: the bot and the game screen load on demand, and the first load stays < 2 MB.

## Why
F16 teaches every rule up to checkmate, but a kid can't yet **play a whole game**, which is the course's promise ("basics to a first win"). The last castle node, "Your first game", still says "Coming soon". F17 adds:
1. **Games against Kukoos**: our own small, friendly, offline bot with 4 levels that make human-like slips, so a beginner can win.
2. **"Your first game"**: the capstone node. Beating Sleepy Kukoos crowns it and completes the castle.

**Decision (2026-11-03):** F17 is **kid vs computer only**. A beginner learns best against a patient Kukoos with take-backs and hints. Pass-and-play (two players on one device) moves to a later feature.

## User stories
- As a kid who just learned the rules, I want to play a real game against Kukoos, and sometimes win, so I feel I can actually play chess.
- As a kid who keeps winning, I want a stronger Kukoos so the game stays fun.
- As a kid who has to stop, I want my game to wait for me so I can finish it later.
- As a parent, I want the chess limit I set (if any) to work in games too.

## Scope
1. **Bot** (pure domain, `src/domain/chess/bot/`, seeded RNG):
   - A small search on chess.js's **fast non-verbose move generation**. Verbose `legalMoves` is about 1 ms per call, which is too slow for search. Evaluation is material plus simple piece-square tables, with a bonus for mate and a penalty for stalemate when ahead.
   - **4 levels**, each set by search depth and a "slip" rate (how often it picks a weaker, still plausible move):

     | Level | Name | Search | Plays like |
     |---|---|---|---|
     | 1 | **Sleepy Kukoos** 😴 | 1 ply, many slips | Often leaves pieces hanging. Takes a free piece about half the time. |
     | 2 | **Playful Kukoos** 🙂 | 1 ply + captures, some slips | Takes free pieces and sometimes misses threats. |
     | 3 | **Clever Kukoos** 🤓 | 2 ply, few slips | Always takes mate in 1 and rarely hangs pieces. |
     | 4 | **Wise Kukoos** 🦉 | 3 ply, rare slips | A solid beginner opponent. |
   - The same seed and position always give the same move, so tests are repeatable.
   - It runs in a **Web Worker**, so the board and animations stay smooth. It answers within about 1 s on a mid-range tablet, and waits at least about 0.6 s so the reply doesn't feel instant.
2. **Game setup:** **Play** on the chess home opens a setup sheet:
   - Opponent: one of the 4 Kukoos levels.
   - Colour: **White** (moves first, the default), **Black** or **Surprise me**.
   - All levels are open from the start, since chess is open play. After a win, Kukoos suggests the next level ("Want to try Playful Kukoos?").
3. **Game screen** (`/chess/play`, lazy):
   - The F15 board with legal-move dots, why-not hints, last-move highlight, check glow and promotion picker.
   - A turn banner ("Your turn" / "Kukoos is thinking…"), and captured pieces shown for each side.
   - **Take back**: undoes your last move and Kukoos's reply. It's unlimited, and it's how a beginner recovers from a blunder without shame.
   - **Hint**: Kukoos highlights a good move, found by a level-4 search from your side. Hints are unlimited.
   - **Whisper** (Sleepy Kukoos only): after the kid's move leaves a piece that can be taken for free, Kukoos says once "Psst… your bishop can be taken!" and marks the piece. The kid can take the move back or play on.
   - **End game**: asks "Stop this game?" (yes / keep playing). Ending isn't a loss and isn't shown as one.
   - Bot moves are read aloud when read-aloud is on ("Kukoos moves the knight to f6."), and announced in the board's live region.
4. **Game end:** the F14 status decides the result.
   - **Win:** celebration (confetti, `celebrate` sound, Kukoos cheers) and rewards.
   - **Kukoos wins:** "Good game! Sleepy Kukoos won this time." Then **Rematch**, **Easier Kukoos** (if there's one) and **Back to the castle**. There's no sad sound.
   - **Draw:** the kind is named and explained in one line (stalemate, only kings, three times the same, 50 moves), reusing the F16 "draws" lesson words.
   - Then **Play again** / **Back to the castle**. **Review moves** (step through the game) is out of scope.
5. **Saving and resuming:**
   - Every move autosaves to a new **`games` table**, which needs Dexie schema v2 with an upgrade.
   - A saved game holds: id, profileId, opponent (`bot:1–4`; `local` is reserved for later pass-and-play), kid's colour, start FEN, moves (UCI list), result (`win` | `loss` | `draw:<reason>` | `ended` | null), startedAt, endedAt, updatedAt, version.
   - Opening Play with an unfinished game offers **"Keep playing your game?"** (keep playing / new game). Each kid has at most one unfinished game.
   - Games are included in backup/restore (F011) and stay unsynced, like everything else.
6. **Rewards** (these reuse the existing XP and crystal wallet):
   - A finished game of at least 10 moves each earns XP. A win earns more.
   - The **first win at each level** gives crystals.
   - Ending a game early, take-backs and hints never take anything away.
   - Chess badges stay in F18.
7. **"Your first game" node:**
   - The last castle node opens a game with Sleepy Kukoos, the kid playing White.
   - It is **crowned on the first win against any level**.
   - Crowning it completes the castle and plays the castle-complete moment. The Throne Room sticker stays as F16 made it.
   - The node is open from the start, like every Play option.
8. **Time:** active game time counts toward `chessSeconds`. Time spent waiting for the bot or with the tab hidden doesn't count. When the optional chess limit is reached mid-game, the game is **saved and paused** ("Chess time is done for today. Your game is saved!") and resumes the next day.

## Acceptance criteria
- **AC1 (bot is legal and repeatable):** across 200 seeded random positions × 4 levels, the bot returns a legal move, the same seed returns the same move, and it never moves when the game is over.
- **AC2 (levels get stronger):** in seeded bot-vs-bot matches (40 games per pairing, colours alternating), level N+1 scores ≥ 70% against level N, and level 1 scores ≥ 70% against a random mover.
- **AC3 (level traits):**
  - Level 3 and level 4 always play a mate in 1 when one exists, checked on the F16 mate-in-1 list.
  - Level 1 leaves a hanging piece undefended at least sometimes over seeded games, so it can be beaten.
  - No level stalemates a lone king when it could mate in 1.
- **AC4 (speed):** level 4 picks a move in ≤ 1 s for the 50 test middlegame positions (measured in Node CI as ≤ 1.5 s, with headroom for slower machines). The board stays responsive while Kukoos thinks (the move runs in the worker).
- **AC5 (game vs Kukoos):**
  - Given a new game vs Sleepy Kukoos as White, the kid moves and Kukoos replies after the "thinking" pause.
  - **Take back** restores the position before the kid's last move.
  - **Hint** highlights a legal move.
  - Illegal tries show the F15 why-not hint.
  - Against Sleepy Kukoos, a move that leaves a piece free to take gets the whisper once. At levels 2–4, and when the piece is defended well enough, there is no whisper.
- **AC6 (game end):** a checkmate win plays the celebration and awards XP, and crystals on the first win at that level. A loss shows "Good game!" with Rematch / Easier Kukoos, and has no loss sound and no "game over" text. A stalemate names and explains the draw.
- **AC7 (save and resume):** given an unfinished game, when the app is reloaded and Play is opened, "Keep playing your game?" restores the exact position, side to move and opponent. A finished game is saved with its result and moves. A v1 database upgrades to v2 without losing data.
- **AC8 (Your first game):** the node opens a Sleepy Kukoos game. A first win crowns it and the castle shows complete. A loss leaves it uncrowned and shows the encouraging end screen.
- **AC9 (time and limit):** game time adds to `chessSeconds`, bot thinking time does not, and reaching the chess limit mid-game saves the game and shows the chess rest screen. The game resumes the next day. Math time is untouched.
- **AC10 (load budget):** the first load stays < 2 MB, and the bot and game screen load only when a game opens (perf test).
- **AC11 (E2E):** a chess-only kid opens Play, picks Sleepy Kukoos, makes moves, uses take back and hint, ends the game, starts again and reloads mid-game to resume. A seeded Scholar's mate against Sleepy Kukoos wins and crowns "Your first game".

## UX notes
- **Setup sheet:** 4 large Kukoos cards, each with its mood face and a one-line description ("Sleepy Kukoos: just learning, like you!") and a colour toggle under them. Every label can be read aloud. Tap targets are ≥ 48 px.
- **Game screen:** the board takes most of the room. The turn banner is above it, and Kukoos sits beside it in a thinking pose with a gentle bob (static in reduced motion). Captured pieces are shown small. The buttons (Take back, Hint, End game) sit below the board and fit on a 360 px phone with headroom for Linux CI font wrapping.
- **Words:** "Your turn", "Kukoos is thinking…", "Check! Protect your king.", "Good game!", "You won! 🎉". There's no "game over" and no "you lose".
- **Sounds:** the existing move, capture, check and celebrate sounds. There's no sound for losing.
- **No clocks** anywhere.

## Out of scope
- Game review or replay, PGN export, opening names and move notation lists (Phase 2).
- **Pass-and-play** (two players on one device): a later feature (decision 2026-11-03). The hidden `/chess/board` free board stays as it is until then.
- Online play, or two devices playing each other.
- Draw offers and claiming draws by hand. Draws are automatic (F14), and **End game** covers the rest.
- Chess badges and the chess part of the Grown-ups dashboard (F18). F17 saves the games F18 will report on.
- An adjustable or "adaptive" bot beyond the 4 fixed levels.

## Decisions (2026-11-03)
- **Kid vs computer only.** Pass-and-play moves to a later feature.
- **Chess limit reached mid-game:** the game is saved and paused, and it resumes the next day.
- **All 4 levels are open from the start.** After a win, Kukoos suggests the next level.
- **"Your first game" is playable any time.** The crown needs a win.
- **Hanging-piece whisper, at Sleepy Kukoos only:** after the kid's move leaves a piece that can be taken for free, Kukoos says "Psst… your bishop can be taken!" once for that move. It's in scope.
