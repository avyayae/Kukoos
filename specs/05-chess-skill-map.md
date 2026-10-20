# Curriculum Skill Map — Chess (basics to a first win)

**Status:** Approved (2026-10-20)

Each **skill** is the smallest teachable unit. Skills are grouped into castle **areas** (map regions) and unlock in order through mastery (constitution §2.1), with a skip-ahead check for learners who already know a skill.

Every puzzle's answer is computed by the rules engine (`@/domain/chess`, constitution §3.4). Positions come from seeded generators or hand-written lists that tests validate. For example, every mate-in-1 must satisfy `isMateInOne`.

**Story arc:** Kukoos explores **Chess Castle**. It starts in the Courtyard (the board and how each piece moves), climbs the Towers (captures and check), and ends in the Throne Room (checkmate), where it meets the King. The last step is a real game against Sleepy Kukoos (F17).

**Concrete → abstract (§2.4):** one piece on an empty practice board → a few pieces → real positions → full games.

## Puzzle kinds
| Kind | The kid… | Correct when |
|---|---|---|
| `find` | taps the named square ("Tap e4!"), or where a piece starts | the tapped square matches |
| `reach` | moves the piece to the ⭐ in one move | it lands on the star |
| `stars` | collects every ⭐ with one piece, in at most *n* moves | all stars are taken within *n* moves |
| `capture` | captures the 🎯 piece (or the most valuable one) | the move captures it |
| `safe` | moves the piece to a square no enemy piece attacks | the landing square isn't attacked |
| `count` | says how many squares a piece can reach (big number tiles) | the count matches `reachable` |
| `escape` | gets the king out of check | the side to move isn't in check afterwards |
| `which` | picks Check / Checkmate / Stalemate / Nothing for a position | it matches `status` |
| `mate1` | plays mate in one | the move is in `mateInOneMoves` |
| `mate` | mates a lone king with Q+K or R+K, against a defending king | checkmate within the move limit |

## Area 1 — Courtyard 🏰 (the board and the pieces)
| Skill ID | Description | Kinds | Board |
|---|---|---|---|
| `chess.board` | Squares, files a–h and ranks 1–8, light square on the right, finding squares | find | empty |
| `chess.rook` | The rook moves in straight lines | reach, stars, count | practice |
| `chess.bishop` | The bishop moves diagonally and stays on its colour | reach, stars, count | practice |
| `chess.queen` | The queen moves like a rook and a bishop together | reach, stars, count | practice |
| `chess.king` | The king moves one step, any direction | reach, stars | practice |
| `chess.knight` | The knight jumps in an L and can jump over pieces | reach, stars, count | practice |
| `chess.pawn` | Pawns step forward (two from the start), capture diagonally, and promote | reach, capture | practice |
| `chess.setup` | Where every piece starts | find | start |
Reward: the Courtyard flag 🚩 sticker.

## Area 2 — Towers 🗼 (capturing and check)
| Skill ID | Description | Kinds | Board |
|---|---|---|---|
| `chess.capture` | Capturing; piece values (pawn 1, knight/bishop 3, rook 5, queen 9); take the best one | capture | practice |
| `chess.safety` | Don't leave a piece where it can be taken for free | safe | practice |
| `chess.check` | What check is; spotting it | which | real |
| `chess.escape` | Getting out of check: move, block or capture | escape | real |
| `chess.special` | Castling (and when you can't) and en passant | reach, which | real |
Reward: the Tower bell 🔔 sticker.

## Area 3 — Throne Room 👑 (checkmate)
| Skill ID | Description | Kinds | Board |
|---|---|---|---|
| `chess.mateOrNot` | Checkmate vs stalemate vs check | which | real |
| `chess.draws` | Draws, lightly: stalemate, only the kings left, and repeating moves | which | real |
| `chess.mate1` | Mate in one: back rank, queen and king, smothered knight | mate1 | real |
| `chess.mateQK` | Mate a lone king with queen and king | mate | real |
| `chess.mateRK` | Mate a lone king with rook and king | mate | real |
Reward: the King's crown 👑 sticker. Next: **Your first game** vs Sleepy Kukoos (F17).

## Mastery and skip-ahead
- Each skill uses the math course's mastery model: about 80% first-try aim, crowns, spaced review (constitution §2).
- **Skip-ahead check** (decision 2026-10-19): the first time a skill opens, Kukoos offers "Already know this?". Three harder puzzles from the skill follow. Getting all three right on the first try crowns the skill (marked `preMastered`, like the math starting point) and opens the next one. Otherwise the lesson starts as usual. No penalty, and the offer can be skipped.
- **Mistake patterns:** illegal attempts are recorded with their `IllegalReason` (spec 014), e.g. `chess.not-how-it-moves:n` for knight confusion or `chess.into-check`. They feed the F18 dashboard.
