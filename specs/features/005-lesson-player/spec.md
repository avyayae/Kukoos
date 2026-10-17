# Feature 005 — Lesson Player

**Status:** Implemented. All ACs are verified locally; CI is pending on the PR.  ·  **Constitution check:** §1.2 no shame (no lives, gentle copy), §1.4 can play without reading (TTS on every prompt), §2.3 adaptive difficulty (staircase), §2.4 concrete → pictorial → abstract (blocks → guided column → free), §3.4 code computes answers (domain `check()`), §3.7 accessible and reduced motion

## Why
This is the first time the kid can actually **play**. F003 can generate and check every problem. F05 turns that into the Duolingo-style core loop: one question at a time, big friendly controls, Kukoos reacting, and (above all for our first player) **hands-on regrouping**. She trades a ten rod for ten ones with the blocks, then solves in columns with Kukoos guiding her column by column, and gets a hint about *her* mistake when she slips.

## User stories
- As a **kid**, I want to pick a skill and play a short lesson (about 10 questions, 3–5 min), so practice feels like a game round.
- As a **kid**, I want to hear every question read aloud (🔊), so I don't need to read well.
- As a **kid**, I want to trade a ten for ten ones with blocks, and borrow in the column grid by tapping a digit, so regrouping makes sense.
- As a **kid**, when I'm not right yet, I want Kukoos to tell me what to look at and let me try again, with no penalty.
- As a **kid**, I want questions to get a little harder when I'm doing well and easier when I'm stuck.
- As a **parent**, I want to see that the lesson adapts and that mistakes lead to help, not punishment.

## Scope
### Screens & routes
| Route | Screen | Notes |
|---|---|---|
| `/` | Shell (F001) | START → `/practice` |
| `/practice` | **Practice picker** (temporary) | Worlds 1–5 as sections, skill cards in path order. **Replaced by the world map in F07.** |
| `/lesson/:skillId` | **Lesson** | Optional `?seed=` (reproducible lessons for e2e) and `?d=` (start difficulty, default 2) |
| (inside lesson) | **Lesson complete** | Stats + CONTINUE back to `/practice` |

### Lesson rules
- **Length:** 10 questions. A question failed twice comes back once at the end, so a lesson has at most 12 questions.
- **Kind schedule** (temporary until F06 picks kinds by mastery):
  - Column skills: `tradeBlocks, tradeBlocks, column(guided), column(guided), column, column, numeric, mcq, column, trueFalse`
  - Mixed: `column(guided), column, column, numeric, mcq` × 2
  - Place-value trade skills: `tradeBlocks ×3, numeric ×4, mcq ×3`
  - Other skills: rotate through `skill.kinds`
- **Difficulty staircase:** start at `d` (default 2). After 2 first-try corrects in a row, +1 (max 5). After any miss, −1 (min 1). It only affects the *next* question.
- **Attempts** (no lives, ever):
  1. 1st miss → "Not yet" banner with a **targeted hint** (from the misconception, else the skill's hint) + **SHOW ME** (visual hint) + TRY AGAIN.
  2. 2nd miss → the **worked solution** (column steps or the correct answer shown visually) + CONTINUE. The question is re-queued once at the end.
  - Choice-type questions (mcq / trueFalse / compare): a wrong tile is marked and disabled, then retry.
- **Seeds:** `lessonSeed` comes from `?seed` or the clock. Question *i* uses seed `lessonSeed * 1000 + i`, so a seeded lesson is fully reproducible.

### Question renderers (all kinds from F003)
| Kind | Interaction | Response sent to `check()` |
|---|---|---|
| `numeric` | Display (equation / units / digit-in-place) + on-screen **Keypad** | `number` |
| `mcq` | 4 **ChoiceTiles** (2×2 phone, 4×1 tablet) | `choice` |
| `trueFalse` | Two big tiles: ✓ True / ✗ False | `boolean` |
| `compare` | Two numbers + three tiles `<` `=` `>` | `comparison` |
| `column` ⭐ | **ColumnGrid**: answer cells (filled right to left via Keypad), carry boxes (+), tap a top digit to **borrow** (strike-through, new value above, neighbor gains 10). **Guided mode:** the active column is highlighted, and Kukoos says what to do in that column (from solver steps). | `columnDigits` |
| `tradeBlocks` ⭐ | **BaseTenBlocks** scratchpad: tap a ten rod to break it into 10 cubes (animated), tap a flat to break into 10 rods; for subtract, tap blocks to take them away; live count labels. Answer typed on the Keypad. | `number` |

Borrow/carry marks in the column grid and block trades are **scratch work**: they help the kid but aren't graded. Only the answer is graded.

### Feedback & copy (Kukoos voice, ≤ 8 words where possible)
| Moment | Banner | Kukoos mood | Spoken |
|---|---|---|---|
| Correct | success-tint, ✓, rotating praise ("Awesome!", "Roar-some!" in savanna, "Stellar!" in space…) | happy | the praise |
| Combo 3 / 5 / 10 | flame pill in the top bar | cheer | "You're on fire!" |
| 1st miss | danger-tint, ↺, "Almost!" + targeted hint | encourage | hint |
| 2nd miss | danger-tint, "Let's look together" + worked solution | encourage | "Here's how we do it." |

Targeted hints (`content/hints.en.json`, hand-written now and expanded by build-time AI in F09):
| Key | Hint |
|---|---|
| `sub.smallerFromLarger` | "Can we take {b} from {a}? Trade a ten first!" |
| `sub.borrowNoDecrement` | "You traded a ten. Cross it off next door!" |
| `sub.acrossZeroSkip` | "No tens to trade! Open a hundred first." |
| `add.forgotCarry` | "{x} is more than 9. Carry the ten!" |
| `add.wroteWholeSum` | "Only one digit fits. Carry the ten!" |
| `wrongOperation` | "Look at the sign. Plus or minus?" |
| `offByOne` | "So close! Count once more." |
| `offByTen` | "Check your tens!" |

`{a}`, `{b}` and `{x}` are filled from the first column where the bug shows up (from solver steps).

### Lesson complete
Kukoos (cheer) + "Mission complete!" + three stat cards: 🎯 first-try accuracy, ⏱ minutes, 🔥 best combo. Then CONTINUE. **No XP, gems or streak yet (F08). No saving yet (F04).**

## Wireframes
**Lesson, phone (360px)**: column question, guided
```
┌──────────────────────────────┐
│ ✕  ████████░░░░░░░░░░  🔥3    │  exit · progress (i/10) · combo
│ (Kukoos) "Ones: 6 − 8. Can   │  bubble = prompt or guided step
│  we? Tap the 3 to trade!" 🔊  │
│          ┌──┬──┬──┐           │
│          │  │ ²│16│ ← borrow  │  scratch marks (orange)
│          │  │ 3̶│ 6̶│           │
│        − │  │ 2│ 8│           │
│          ├──┼──┼──┤           │
│          │  │  │▢ │ ← active  │  answer cells
│          └──┴──┴──┘           │
│   [1][2][3]  [4][5][6]        │  keypad 3×4 (≥64px keys)
│   [7][8][9]  [⌫][0]           │
│ ┌──────────────────────────┐ │
│ │          CHECK           │ │  Button3D xl, disabled until filled
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
**Tablet (≥768px, landscape):** the question area is on the left (60%) and the keypad on the right (40%). CHECK spans the full width at the bottom. The column is centered at max 640px wide on portrait tablet.

**Feedback banner (not yet):**
```
│ ┌──────────────────────────┐ │
│ │ ↺  Almost!               │ │  danger-tint sheet slides up
│ │ Can we take 8 from 6?    │ │
│ │ Trade a ten first!       │ │
│ │ [ SHOW ME ]              │ │  ghost button → visual hint overlay
│ │ ┌──────────────────────┐ │ │
│ │ │      TRY AGAIN       │ │ │  danger-soft xl
│ │ └──────────────────────┘ │ │
│ └──────────────────────────┘ │
```

## States
| Element | States |
|---|---|
| CHECK | disabled (no answer) · enabled · hidden while a banner shows |
| Keypad key | default · pressed · disabled (answer slot full) |
| ChoiceTile | default · pressed · selected · correct · incorrect (disabled) |
| Column answer cell | empty · focused · filled · correct (after check) · incorrect |
| Column top digit | normal · borrowed-from (struck, new value above) · received (+10 shown) |
| Block | normal · breaking (animation) · removed (30% + ✕) |
| Banner | hidden · correct · not-yet (1st) · solution (2nd) |
| Kukoos | idle · happy · cheer · think · encourage |

## Acceptance criteria
- **AC1 — Picker:** `/practice` lists all 23 skills grouped by world in path order. Tapping one opens `/lesson/:skillId`. An unknown `skillId` shows a friendly "Lesson not found" with a button back to `/practice`.
- **AC2 — Lesson session (pure):** `lessonSession` is a pure reducer in `src/domain/engine/`. Given the same seed and the same answers, it produces the same question sequence. It implements length/re-queue (≤ 12), the kind schedule, the staircase, and attempt rules. It's unit-tested, including the full rule table.
- **AC3 — Renderers:** each of the 6 kinds renders its question, collects a response, and enables CHECK only once an answer exists. Component tests cover every kind.
- **AC4 — Correct flow:** given a correct answer, CHECK shows the success banner with praise, the answer is announced via an `aria-live` region, and CONTINUE advances the progress bar.
- **AC5 — Not-yet flow:** given a wrong answer with a detectable misconception, the banner shows that misconception's hint with numbers filled in. SHOW ME opens the visual hint. TRY AGAIN keeps the same question, with no score/heart/negative UI anywhere.
- **AC6 — Second miss:** given two misses, the worked solution is shown and CONTINUE moves on. The question reappears once before the lesson ends.
- **AC7 — Column interaction:** given 403 − 178 in a column question, tapping the hundreds 4 shows 4→3 and the tens 0→10. Tapping the tens 10 then shows 10→9 and the ones 3→13. Tapping a 0 that has nothing to lend gets the bubble "Nothing to trade here. Try the next one!" Digits typed fill cells right to left. `5, 2, 2` is accepted. A guided question highlights one column at a time and shows that column's step text.
- **AC8 — Trade blocks:** tapping a ten rod breaks it into 10 cubes and updates the count label ("2 tens 16 ones"). With reduced motion the swap is instant. The typed answer is what gets checked.
- **AC9 — Speech:** every question has a 🔊 button that speaks `prompt.speech` (Web Speech API). Auto-read is on by default and can be turned off with a toggle in the lesson top bar (kept in memory until F11 settings). Where speech isn't available, the button is hidden and nothing errors.
- **AC10 — Lesson complete:** after the last question, the summary shows first-try accuracy, minutes and best combo, and CONTINUE returns to `/practice`.
- **AC11 — Exit:** ✕ asks "Leave this mission?" (Stay / Leave). Leave returns to `/practice`.
- **AC12 — Layout & a11y:** at 360 / 768 / 1280px the lesson question never scrolls and the page has no horizontal scroll. Kid controls are ≥ 56px. Everything is operable by keyboard on desktop (digits, Backspace, Enter = CHECK/CONTINUE). Focus is visible. There are no console errors.
- **AC13 — Reduced motion:** with `prefers-reduced-motion`, no transform animations (banner, shake, trades, Kukoos bounce); opacity fades ≤ 150ms only.
- **AC14 — E2E happy path:** Playwright plays a full seeded lesson for `sub.within100.regroup` on phone, tablet and desktop, computing each answer with the domain generator. It answers one question wrong on purpose and asserts the targeted hint, then reaches Lesson complete.

## Out of scope
- Saving progress, mastery, spaced review, choosing kinds by mastery (F04/F06).
- XP, gems, streak, badges, confetti and celebration sequencing (F08).
- Sound effects, Rive mascot, AI-written voice lines (F09). Kukoos stays the placeholder SVG with simple CSS mood animations.
- World map (F07), time tracking/daily limit (F08), settings (F11).

## Decisions (approved 2026-10-16)
1. Start difficulty is 2, and the staircase adapts from there.
2. Auto-read is on by default, with a 🔇 toggle in the lesson top bar.
