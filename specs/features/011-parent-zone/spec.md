# Feature 011 — Parent Zone

**Status:** Implemented (PR pending)  ·  **Constitution check:** §1.5 privacy (PIN stored only as a salted hash, on the device), §1.3 no dark patterns (the dashboard is for grown-ups; kids never see scores ranked), §3.2 pure domain (report math in `src/domain/report.ts`), §2.1 mastery (the heatmap reads the real mastery model)

## Why
Grown-ups is protected only by a multiplication question a sibling could solve, and you can't yet *see* how she's doing. Product spec §5.5 promises a PIN-protected parent zone with a per-kid dashboard. Above all it promises **top misconceptions**: the app already detects regrouping bugs on every answer ("smaller-from-larger", "forgot the carry", "borrow across zero") but never shows them. That's the signal for whether carry/borrow is sinking in.

## Decisions (parent, 2026-10-18)
- **A 4-digit PIN only** replaces the multiplication question. The PIN is set on the first visit to Grown-ups.
- **Forgot PIN?** A harder grown-up question (2-digit × 2-digit, typed answer) lets you set a new PIN. No data is lost.

## User stories
- As a parent, I want a PIN on Grown-ups, so my kids can't change limits or delete progress.
- As a parent, I want to see each kid's mastery, minutes, accuracy and recurring mistakes, so I know what to practise together.
- As a parent, I want to reset a kid's progress without deleting the kid.

## Acceptance criteria
- **AC1 (PIN storage):** `setPin('1234')` stores a salted SHA-256 hash and salt on the device settings row (never the PIN itself). `checkPin` is true only for the right PIN. Backups include the hash, never the PIN.
- **AC2 (set PIN):** with no PIN yet, opening Grown-ups asks to **create** a 4-digit PIN, entered twice. A mismatch says so and starts over.
- **AC3 (enter PIN):** with a PIN, Grown-ups asks for it on a big PIN pad with 4 dots. Right → unlocked for this visit. Wrong → "That's not it", cleared. After 5 wrong tries, entry pauses for 30 seconds (countdown shown).
- **AC4 (forgot PIN):** "Forgot PIN?" shows a 2-digit × 2-digit question with a typed answer. Right → set a new PIN; wrong → a new question. Progress is untouched.
- **AC5 (lock):** Grown-ups has a "Lock" button that locks it again. Leaving the app (reload) also locks it.
- **AC6 (report, pure):** `parentReport({ attempts, lessons, days, progress, badges, now })` returns:
  - totals: missions, minutes, first-try %;
  - 14 local days of `{ date, lessonMinutes, totalMinutes, firstTryPct | null }`;
  - mastery per skill grouped by world;
  - `needsPractice` (attempted, uncrowned skills below 60% first-try in the last 14 days or mastery < 0.5, worst first, max 5, plus due reviews);
  - `misconceptions` (counts in the last 7 and 14 days, most frequent first);
  - recent badges.

  Deterministic and unit-tested.
- **AC7 (dashboard):** Grown-ups → **Progress** (`/grown-ups/progress`) shows, for a chosen kid:
  - summary tiles;
  - a 14-day minutes chart (lesson vs. total, goal line) and first-try % per day;
  - the mastery heatmap (every skill, colour plus 👑 and text, never colour alone);
  - the needs-practice list;
  - the top mistakes, with friendly names and the hint Kukoos gives;
  - recent badges.

  Empty states explain what will appear.
- **AC8 (reset):** Profiles → "Reset progress…" (type the nickname) removes that kid's missions, answers, mastery, wallet, badges and minutes. It keeps the kid, the explorer and their settings.
- **AC9 (E2E):** first visit sets a PIN → Grown-ups opens; after a reload a wrong PIN is refused and the right one opens; "Forgot PIN?" resets it. After a lesson with a deliberate smaller-from-larger mistake, the dashboard shows the minutes, the mission and "Smaller from larger: 1".

## UX notes
- The PIN pad reuses the lesson Keypad (big keys, no OS keyboard), with 4 dots that fill.
- The dashboard is a grown-up screen: 16px parent text, dense but calm. The chart is plain SVG bars with token colours, the heatmap is a grid of skill chips with mastery %, and everything stays readable in dark mode.
- The Grown-ups home gains a **"See {name}'s progress"** card at the top.

## Out of scope
- Cloud sync, emailed reports, printable certificates (Phase 2).
- "Worlds enabled" switches and background music: deferred, since every world is gated by mastery anyway.
