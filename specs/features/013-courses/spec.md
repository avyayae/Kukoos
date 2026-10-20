# Feature 013 — Courses (Math + Chess)

**Status:** Approved (2026-10-19)  ·  **Constitution check:** this feature **amends** the constitution (see below). Also touches:
- §1.3: chess is open play, outside the daily limit;
- §1.4: picture-first course choice, read aloud;
- §1.5: still no accounts;
- §3.5: new fields keep the sync shape;
- §3.7: chess code must not grow the first load.

## Why
Kukoos v2 adds a **Chess course** for any kid who wants to learn chess from the basics, not only the original Grade 2–3 math learner (decisions 2026-10-19, `specs/04-roadmap.md` → v2). Before any chess can be built, the app has to stop assuming "everyone plays math":
- kids choose what to learn and switch freely;
- each course has its own home;
- shared things stay shared: profile, avatar, XP, level, crystals and badges.

F13 builds that frame. The chess content comes in F14–F18. Until then the chess course is hidden in production builds.

## Decisions (2026-10-19)
- **Audience:** kids about 5–12 at any starting level. The Kukoos style stays. Adults are welcome but not designed for.
- **One app, two courses.** Each profile picks Math, Chess or both. A chess-only learner never sees math.
- **The app is called "Kukoos"** (manifest name and page title). Previously it was "Kukoos Math Quest".
- **Kids choose and switch courses themselves.** No grown-up PIN is needed to add, remove or switch courses.
- **Chess has no daily goal and no streak, and no time limit by default.** It's open play, as much as the kid wants. The math goal, streak and daily limit stay as they are and only count math.
- **Optional chess daily limit** in Grown-ups, **off by default**, for families who want one.

## User stories
- As a new kid, I want to say whether I'm here for math, chess or both, so I see only what I came for.
- As a kid, I want to switch between Math and Chess with one tap, and add or drop a course myself.
- As a kid, I want to play chess as long as I like, without a timer or a goal.
- As a grown-up, I want the math goal and limit to keep working exactly as today.
- As an existing math player, I want nothing to change for me: same map, progress, streak and settings.

## Scope
1. **Course model (pure domain):** a course registry (`math`, `chess`), each with an id, name, icon, home route, an `available` flag and a `timed` flag. Math is timed; chess isn't. `chess.available` is false in production until F16. It's switched on with `VITE_CHESS=1` for dev and e2e.
2. **Profile courses:**
   - `profile.courses`: one or more course ids. An absent field means `['math']`, so existing profiles are unchanged.
   - Each profile remembers its current course.
   - `profile.grade` only matters for math.
3. **First run:**
   - With chess available, the welcome is course-neutral ("Hi! I'm Kukoos. Let's learn and play together!"). A new **"What do you want to learn?"** step follows, with big picture cards for 🔢 Math and ♞ Chess (pick one or both).
   - With one course available (production until F16), the welcome and steps are exactly today's.
4. **Home and switching:**
   - `/` opens the current course's home. Math is today's map.
   - With 2 courses, the header shows a **course switcher**: two large chips, the current one highlighted, tap-to-hear.
   - **Me screen → "My courses"** lets the kid add or remove a course. At least one stays, and no PIN is needed.
   - Chess's home in F13 is a placeholder ("Chess Castle is being built!"), visible only when chess is available.
5. **Time:**
   - **Only math is timed.** Math lessons fill the math goal ring, math streaks work as today, and math and map time count toward the daily limit as today.
   - **Chess time is recorded** (for the F18 dashboard) but never fills a goal, builds a streak, or counts toward the math limit.
   - The chess home shows no goal ring, streak or time heads-up.
   - **Optional chess limit** (Grown-ups → "Chess daily limit": off, 15, 20, 30, 45 or 60 min; default off). When it's reached, the chess home shows a calm "Chess pieces are resting until tomorrow" screen. There's no +10 for chess: the grown-up changes the limit instead.
   - When math reaches Goodnight, a kid who has chess (and chess time left) sees "Math is sleeping. Want to play chess?" with a button to the chess home. A math-only kid sees today's Goodnight.
6. **Rewards:** XP, level, crystals and badges stay **shared** in one wallet, earned by real practice in either course. The streak (and streak badges such as Astronaut) is math's only.
7. **Grown-ups:** when chess is available, daily time is labelled "Math daily time", with the chess limit below it. Backups include the new fields, and old backups restore as math-only.

## Acceptance criteria
- **AC1 (course model):** `COURSES` lists `math` (timed) and `chess` (untimed) with id, name, icon and home path. `availableCourses(flags)` returns only available courses. `profileCourses(profile, available)` returns the profile's available courses (default `['math']`, never empty: it falls back to the first available course). Pure and unit-tested.
- **AC2 (data, migration):**
  - Profiles gain optional `courses` and `currentCourse`.
  - `dailyActivity` gains `chessSeconds`, and per-profile settings gain `chessLimitMin` (absent = off). The existing goal, limit, streak and seconds fields keep their meaning (math).
  - All new fields are optional and unindexed, so no schema bump is needed. Tests prove that F012-era rows and backups load unchanged as math-only.
- **AC3 (chess is untimed):**
  - Given a kid with both courses and the math limit reached, when they switch to chess, then the chess home opens and stays usable, while math still shows Goodnight.
  - Chess time increases `chessSeconds` only: not the goal, the limit total or the streak.
  - With a chess limit set, `chessBudget` locks chess once `chessSeconds` reaches it, and the chess home shows the resting screen. Math is unaffected.
  - The time-tracking logic is unit-tested, and the existing spec 008 tests still pass.
- **AC4 (shared rewards):** XP, level, crystals and badges live in one wallet per kid, whichever course earned them. The streak counts math only.
- **AC5 (first run):**
  - With two courses available, a fresh device shows Welcome → "What do you want to learn?" → Name → Look → the chosen course's home (math when both are picked).
  - Choosing "Chess" only means math never appears: no map, no math chip, no goal ring.
  - With one course available, the step is skipped and the flow matches today's.
- **AC6 (switcher):**
  - With 2 courses, the header shows the switcher. Tapping a course opens its home, speaks its name, and stays selected after a reload.
  - With 1 course there's no switcher.
  - Each chip is ≥ 48px, with the course name as its accessible name and the current course marked.
- **AC7 (my courses):**
  - Me → My courses adds or removes a course without the PIN, and at least one always stays.
  - Removing a course hides it but keeps its progress, and adding it back restores everything.
  - Removing the current course switches to the remaining one.
- **AC8 (name and no regression):**
  - The manifest name and page title are "Kukoos".
  - Every existing unit and e2e test passes (updated only for the title).
  - With chess unavailable (production), the map, lesson, Goodnight and Grown-ups look as they do today.
- **AC9 (E2E, `VITE_CHESS=1`):**
  - A fresh device picks both courses and lands on Math.
  - It switches to Chess (placeholder home) and back, and a reload keeps the current course.
  - With the math limit seeded as reached, Goodnight offers chess and chess opens.
  - A chess-only kid never sees the math map.
  - Me → My courses adds Math to a chess-only kid, and the switcher appears.

## UX notes
- **Course cards** (onboarding, My courses and the switcher) use the same 3D tile style as the avatar builder: icon, name and a tick when chosen. Kukoos reads each name.
- **Switcher placement:** under the greeting in the header, so it fits a 360px phone without crowding the stats. CI fonts wrap wider, so leave headroom.
- **Chess header:** avatar, greeting, switcher, crystals and level. No goal ring or 🔥, so nothing suggests a timer.
- **Goodnight with chess:** Kukoos sleeping on the math side, then "Math is sleeping. Want to play chess?" with a Button3D to chess. No guilt copy, and no math play button.
- **Placeholder chess home:** Kukoos in a knight's helmet, "Chess Castle is being built! Come back soon," and the switcher. No dead buttons.
- **Motion:** switching courses cross-fades the home (no slide), with reduced motion respected. No new sounds beyond `tap`.

## Out of scope
- Any chess content: rules, board, lessons, bot (F14–F17). Chess on the dashboard (F18).
- A chess goal or streak, and a chess +10 grant (decided: chess is open play).
- A course for adults, or more than two courses.
- Renaming the repo or the domain (`avyayae.github.io/Kukoos/` stays).

## Constitution amendments (applied when this spec is approved)
| § | Today | New |
|---|---|---|
| Title | "MathQuest" | **"Kukoos"**: a learning-adventure app with courses (Math, Chess) |
| 1.1 | "No reward without math." | "No reward without **real practice in a course**." |
| 1.3 | "The parent sets session limits and the app respects them." | "The parent sets the **math** goal and daily limit, and the app respects them. **Chess is open play:** no goal, no streak, no pressure loops (no timers, no 'come back' nudges), and no limit unless a grown-up turns on the optional chess limit." |
| 1.6 (new) | — | "**Built for any family.** No feature assumes one particular kid's level, schedule or language. Defaults suit a new learner." |
| 2.4 | concrete → pictorial → abstract (blocks, arrays…) | Same principle, with course examples. Math: blocks and number lines. Chess: one piece on an empty board → small positions → full games. |
| 2.5 | every skill maps to CCSS Grade 2–3 | **Math:** every skill maps to CCSS Grade 2–3. **Chess:** every skill maps to the chess skill map (`specs/05-chess-skill-map.md`, drafted in F16), from the board to a first win. |
| 3.4 | code computes every number and correct answer | Also: "**A rules engine decides every legal move, check, mate and draw; the bot's moves are computed by code.** AI never decides a chess answer." |
| 3.7 | initial load < 2 MB | unchanged, plus: "**Course code loads on demand.** Adding a course must not grow the first load past the budget." |

