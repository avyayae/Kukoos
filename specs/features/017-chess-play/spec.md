# Feature 017 — Chess Play: Friendly Bot & Pass-and-Play

**Status:** Draft (2026-11-03)  ·  **Constitution check:**
- §1.2: no shame. A lost game is "Good game!", never "game over". There are no lives and no penalties for resigning.
- §1.3: chess is open play, with no clocks or timers in games and no "come back" nudges. The optional chess daily limit (F13) is respected.
- §1.1: rewards come only from finished games (real play). Pass-and-play earns no rewards, so they can't be farmed.
- §2.3: bot levels aim at a game the kid can win, and the next level is suggested after a win.
- §2.4: this is the "full games" step of concrete → abstract.
- §3.4: the bot is code. It picks moves with a seeded search on the F14 rules engine, and no AI picks or judges moves.
- §3.5: saved games are records with `id`, `profileId`, `updatedAt`, `version`.
- §3.7: the bot and the game screen load on demand, and the first load stays < 2 MB.

## Why
F16 teaches every rule up to checkmate, but a kid can't yet **play a whole game**, which is the course's promise ("basics to a first win"). The last castle node, "Your first game", still says "Coming soon". F17 adds:
1. **Games against Kukoos**: our own small, friendly, offline bot with 4 levels that make human-like slips, so a beginner can win.
2. **Pass-and-play**: two people on one device, which replaces the hidden free board at `/chess/board`.
3. **"Your first game"**: the capstone node. Beating Sleepy Kukoos crowns it and completes the castle.

## User stories
- As a kid who just learned the rules, I want to play a real game against Kukoos, and sometimes win, so I feel I can actually play chess.
- As a kid who keeps winning, I want a stronger Kukoos so the game stays fun.
- As a kid playing with a sibling or parent, I want to pass the tablet back and forth and have the app check the rules for us.
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
   - Opponent: one of the 4 Kukoos levels, or **Two players**.
   - Colour (vs Kukoos): **White** (moves first, the default), **Black** or **Surprise me**.
   - All levels are open from the start, since chess is open play. After a win, Kukoos suggests the next level ("Want to try Playful Kukoos?").
3. **Game screen** (`/chess/play`, lazy):
   - The F15 board with legal-move dots, why-not hints, last-move highlight, check glow and promotion picker.
   - A turn banner ("Your turn" / "Kukoos is thinking…" / "White's turn"), and captured pieces shown for each side.
   - **Take back** (vs Kukoos): undoes your last move and Kukoos's reply. It's unlimited, and it's how a beginner recovers from a blunder without shame.
   - **Hint** (vs Kukoos): Kukoos highlights a good move, found by a level-4 search from your side. Hints are unlimited.
   - **End game**: asks "Stop this game?" (yes / keep playing). Ending isn't a loss and isn't shown as one.
   - Bot moves are read aloud when read-aloud is on ("Kukoos moves the knight to f6."), and announced in the board's live region.
4. **Pass-and-play:**
   - No profile is needed for the second player. The game is saved under the current kid.
   - The **board flips each turn** (on by default, with a toggle), so each player sees their own pieces at the bottom.
   - Take back undoes one move. There's no hint, so neither side gets help.
   - The hidden `/chess/board` route **redirects** to Two players setup.
5. **Game end:** the F14 status decides the result.
   - **Win:** celebration (confetti, `celebrate` sound, Kukoos cheers) and rewards.
   - **Kukoos wins:** "Good game! Sleepy Kukoos won this time." Then **Rematch**, **Easier Kukoos** (if there's one) and **Back to the castle**. There's no sad sound.
   - **Draw:** the kind is named and explained in one line (stalemate, only kings, three times the same, 50 moves), reusing the F16 "draws" lesson words.
   - Then **Play again** / **Back to the castle**. **Review moves** (step through the game) is out of scope.
6. **Saving and resuming:**
   - Every move autosaves to a new **`games` table**, which needs Dexie schema v2 with an upgrade.
   - A saved game holds: id, profileId, opponent (`bot:1–4` | `local`), kid's colour, start FEN, moves (UCI list), result (`win` | `loss` | `draw:<reason>` | `ended` | null), startedAt, endedAt, updatedAt, version.
   - Opening Play with an unfinished game offers **"Keep playing your game?"** (keep playing / new game). Each kid has at most one unfinished game per opponent kind.
   - Games are included in backup/restore (F011) and stay unsynced, like everything else.
7. **Rewards** (vs Kukoos only; these reuse the existing XP and crystal wallet):
   - A finished game of at least 10 moves each earns XP. A win earns more.
   - The **first win at each level** gives crystals.
   - Ending a game early, take-backs and hints never take anything away.
   - Chess badges stay in F18.
8. **"Your first game" node:**
   - The last castle node opens a game with Sleepy Kukoos, the kid playing White.
   - It is **crowned on the first win against any level**.
   - Crowning it completes the castle and plays the castle-complete moment. The Throne Room sticker stays as F16 made it.
   - The node is open from the start, like every Play option (see Open questions).
9. **Time:** active game time counts toward `chessSeconds`. Time spent waiting for the bot or with the tab hidden doesn't count. With a chess limit set, see Open questions for what happens mid-game.

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
- **AC6 (game end):** a checkmate win plays the celebration and awards XP, and crystals on the first win at that level. A loss shows "Good game!" with Rematch / Easier Kukoos, and has no loss sound and no "game over" text. A stalemate names and explains the draw.
- **AC7 (pass-and-play):** in Two players, both colours can move, the board flips each turn (or doesn't, with flip off), take back undoes one move, no hint is offered, and no XP is awarded. `/chess/board` redirects to Two players.
- **AC8 (save and resume):** given an unfinished game, when the app is reloaded and Play is opened, "Keep playing your game?" restores the exact position, side to move and opponent. A finished game is saved with its result and moves. A v1 database upgrades to v2 without losing data.
- **AC9 (Your first game):** the node opens a Sleepy Kukoos game. A first win crowns it and the castle shows complete. A loss leaves it uncrowned and shows the encouraging end screen.
- **AC10 (time and limit):** game time adds to `chessSeconds`, bot thinking time does not, and the chess limit behaves as decided below. Math time is untouched.
- **AC11 (load budget):** the first load stays < 2 MB, and the bot and game screen load only when a game opens (perf test).
- **AC12 (E2E):** a chess-only kid opens Play, picks Sleepy Kukoos, makes moves, uses take back and hint, ends the game, starts again and reloads mid-game to resume. A seeded Scholar's mate against Sleepy Kukoos wins and crowns "Your first game". A Two players game plays a few moves with the board flipping.

## UX notes
- **Setup sheet:** 4 large Kukoos cards, each with its mood face and a one-line description ("Sleepy Kukoos: just learning, like you!"), plus a "Two players" card. There's a colour toggle under them. Every label can be read aloud. Tap targets are ≥ 48 px.
- **Game screen:** the board takes most of the room. The turn banner is above it, and Kukoos sits beside it in a thinking pose with a gentle bob (static in reduced motion). Captured pieces are shown small. The buttons (Take back, Hint, End game) sit below the board and fit on a 360 px phone with headroom for Linux CI font wrapping.
- **Words:** "Your turn", "Kukoos is thinking…", "Check! Protect your king.", "Good game!", "You won! 🎉". There's no "game over" and no "you lose".
- **Sounds:** the existing move, capture, check and celebrate sounds. There's no sound for losing.
- **No clocks** anywhere.

## Out of scope
- Game review or replay, PGN export, opening names and move notation lists (Phase 2).
- Online play, or two devices playing each other.
- Draw offers and claiming draws by hand. Draws are automatic (F14), and **End game** covers the rest.
- Chess badges and the chess part of the Grown-ups dashboard (F18). F17 saves the games F18 will report on.
- An adjustable or "adaptive" bot beyond the 4 fixed levels.

## Open questions
1. **Chess limit reached mid-game.** Recommendation: **save the game and pause it** ("Chess time is done for today. Your game is saved!"), and it resumes tomorrow. Games can last much longer than a math mission, so "finish the game first" could run well past the limit. The alternative is to finish the game, as math finishes the mission.
2. **When levels open.** Recommendation: **all 4 levels open from the start** (open play, and any beginner may already play a bit), with "Your first game" as the castle's suggested path. The alternative is to unlock each level by beating the one before it.
3. **Is "Your first game" locked until the Throne Room is crowned?** Recommendation: **no**, it's playable any time. The crown still needs a win, and a kid who skips the lessons will likely lose and get pointed back to the castle. The alternative is to keep it locked like the other nodes, so the map's path stays strict.
4. **Rewards for pass-and-play.** Recommendation: **none**, because two kids on one profile could farm them. The alternative is a small XP amount for a finished game.
5. **Hanging-piece whisper for Sleepy Kukoos games.** Optional teaching aid: after the kid's move leaves a piece where it can be taken for free, Kukoos says "Psst… your bishop can be taken!" once per move, at level 1 only. Recommendation: **include it, on at level 1 only**. The alternative is to leave it out to keep F17 smaller.
