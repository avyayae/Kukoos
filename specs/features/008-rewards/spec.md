# Feature 008 — Rewards & Daily Time

**Status:** Implemented (PR #7, CI green)  ·  **Constitution check:** §1.1 no reward without math (all rewards come from lesson events), §1.2 no shame (streaks protected by freezes, no guilt copy), §1.3 no dark patterns (parent-set daily limit is respected; no endless loop), §2.3 ~80% success (XP never punishes mistakes), §3.2 pure domain (gamification rules in `src/domain/gamification/`)

## Why
F05–F07 made practice *work*; F08 makes her *want to come back*, and it keeps the time healthy. Rewards turn real practice into visible progress: XP, levels, star crystals, a streak flame, and badges named after the exact skills she's working on (Carry Captain, Borrow Boss, Zero Hero). The parent sets a **daily goal and a daily limit in minutes**. Only active lesson time counts toward the goal, and when the limit is reached Kukoos says goodnight. See product spec §5.4 and §5.4a, and architecture §5 (event → reward-effect pipeline).

## User stories
- As a kid, I want to see stars, crystals and my flame grow after each mission, so that I feel proud and want to play tomorrow.
- As a kid, I want a ring that fills while I play, so I know when I've done "enough" for today.
- As a kid, I want badges for things I'm good at, so I can show them off.
- As a parent, I want to set a daily goal and a daily limit in minutes, so practice is regular but not unlimited.
- As a parent, I want to grant +10 minutes behind the grown-up gate, so a good session doesn't stop mid-flow.

## Rules (pure domain, data-driven)
| Rule | Value |
|---|---|
| XP per completed lesson | base 10, +5 perfect (all first-try), +1 per 3 in the best combo (max +5); boss pass +20 |
| Level | start at level 1; reaching level n+1 needs `50·n·(n+1)/2` total XP (50, 150, 300, 500, …) |
| Star crystals 💎 | 5 per completed lesson, +5 perfect (treasure chest), +10 per badge, +10 boss pass |
| Streak | a local date counts when **goal minutes** are met. Next day → +1. Missing a day: use a freeze if held (streak kept), else reset to 0 with a gentle line |
| Freezes | +1 every 7 streak days, hold max 2 |
| Streak milestones | 3 / 7 / 14 / 30 / 50 / 100 days → rocket climbs higher |
| Daily goal | 5 / **10 default** / 15 / 20 min of **active lesson time** |
| Daily limit | 15 / 20 / 30 / 45 / **60 default** min / off. Counts active time on map + lessons. +10 min parent bonus |
| Active time | ticks every 5s only while the page is visible and the last input was < 60s ago |
| Heads-up | at 2 minutes left: "2 more minutes of space travel today!" |

**Badges (first set, as data):** Carry Captain (crown `add.within100.regroup`), Borrow Boss (crown `sub.within100.regroup`), Zero Hero (crown `sub.3digit.acrossZero`, e.g. 403 − 178), Animal Rescuer (clear any world boss), Astronaut (7-day streak), 100 Correct (100 first-try answers), Perfect Pilot (5 perfect lessons), First Flight (finish the first lesson).

## Acceptance criteria
- **AC1 (XP and levels):** Given a completed lesson with 10/10 first-try and best combo 10, when rewards are computed, then XP = 10 + 5 + 3 = 18. When total XP crosses 50, then a `levelUp` effect is emitted once. Rewards are only computed for completed lessons.
- **AC2 (crystals):** Given a perfect lesson, then gems = 10 and a `chestOpened` effect precedes `gemsGained`. Given a boss pass, then +10 gems and +20 XP.
- **AC3 (streak):** Given the goal met on 2026-10-16 and today 2026-10-17, when the goal is met today, then streak +1, at most once per date (clock changes never award twice). Given a missed day with a freeze held, when the app opens, then one freeze is used, the streak is kept, and "Kukoos kept your flame warm!" is shown. With no freeze, the streak becomes 0 with "Let's start a new flame today!" (no guilt copy).
- **AC4 (freezes):** Given streak days 7 and 14, then a freeze is earned each time, capped at 2.
- **AC5 (time budget, pure):** `timeBudget({ lessonSeconds, totalSeconds, goalMin, limitMin, bonusMin })` returns `{ goalProgress 0–1, goalMet, remainingSeconds, warn (≤ 120s left), locked }`. Limit off means never locked. Fully property-tested.
- **AC6 (active-time tracker):** Given a visible page with recent input, then time is flushed to `dailyActivity` every 5s. Given a hidden tab or 60s idle, then no time is added. Lesson time counts toward the goal; map time counts only toward the limit.
- **AC7 (goal ring):** Given goal 10 min, when active lesson time reaches 10:00, then the ring completes, a "Daily goal done!" celebration plays after the current lesson ends (never mid-question), and today counts toward the streak.
- **AC8 (limit lock):** Given the limit is reached mid-lesson, when that lesson ends, then the goodnight screen appears ("Great job today! Kukoos is going to sleep") and Play / mission nodes are locked until the next local day. Given the gate is passed and +10 min granted, then play is unlocked for 10 more minutes.
- **AC9 (badges):** Given a badge rule becomes true, then the badge row is written once, a `badgeUnlocked` effect plays, and the badge shows in the trophy room. Re-evaluating never awards it twice.
- **AC10 (celebration orchestrator):** Given several effects from one lesson (xp, chest, gems, badge, level up, streak, goal), then they play one at a time in a fixed order, each tap-to-skip, and reduced motion shows static versions with ≤ 150ms fades.
- **AC11 (top bar):** The map header shows 🔥 streak, 💎 crystals, the goal ring and the level. Each is tap-to-hear ("5 day flame!", "40 star crystals").
- **AC12 (grown-ups):** The Grown-ups screen has daily goal and daily limit pickers (per profile), today's minutes, and a "+10 minutes today" button. Values persist and apply immediately.
- **AC13 (E2E):** a fresh kid finishes a lesson → sees an XP count-up + crystals → the map header shows the new totals → after a reload the totals persist. With the e2e clock: a lesson that exceeds the limit ends with the goodnight screen, and the gated +10 unlocks play again.

## UX notes
- **Lesson complete (extends F05):** after the score, the effects queue plays: XP count-up (gentle) → chest pops open on perfect → crystals fly to the header → badge card → level-up banner → streak flame grows → goal ring closes. Each step has a CONTINUE-area tap to skip; one primary button stays bottom-anchored.
- **Map header:** slim, replacing the greeting row right edge: `🔥 5  💎 40  (ring) Lv 3`. 56px tap targets. The ring uses `--mq-success` fill with a ✓ when complete (never color alone).
- **Trophy room:** `/trophies`, from a 🏆 in the bottom bar. A grid of badge stickers: earned in color, not-yet as soft silhouettes with "Not yet" (spoken hint on tap). No locked-count guilt.
- **Goodnight screen:** a night-sky scene, Kukoos asleep (static SVG until F09's Rive), the moon rising, "See you tomorrow!", and today's stars and minutes. Its only button is a quiet "Grown-ups" link (gate → +10). No sound loop.
- **Heads-up toast:** a non-blocking banner at the top for 4s, spoken once.
- **Reduced motion:** no flying crystals or count-up; final numbers fade in.
- Sounds are placeholders (or none) until F09; all effects carry a `sound` key so F09 can hook them up.

## Out of scope
- The avatar shop and spending crystals (F10 / v1.1). Crystals accumulate only.
- Rive Kukoos, real SFX and natural voice (F09).
- Parent PIN and the full dashboard (F11). The existing math gate guards settings and +10.
- Weekly reports, leaderboards, push notifications.

## Decisions (parent, 2026-10-17)
- Default daily limit is **60 min** (picker: 15 / 20 / 30 / 45 / 60 / off). Daily goal default stays **10 min**.
- When the limit is reached mid-mission, she **finishes the whole mission**, then the goodnight screen shows.
- Review missions and boss challenges **count toward the goal** (all lesson time counts).
