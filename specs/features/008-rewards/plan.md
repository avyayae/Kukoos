# Plan — Feature 008 Rewards & Daily Time

## Approach
- **Domain (pure), `src/domain/gamification/`:**
  - `dates.ts`: `localDate(ms)` (device-local `yyyy-mm-dd`), `addDays`, `daysBetween`. This is the only date logic.
  - `xp.ts`: `lessonXp`, `lessonGems`, `xpForLevel`, `levelFor`.
  - `timeBudget.ts`: goal/limit options and defaults, plus `timeBudget()` → `{ goalProgress, goalMet, remainingSeconds, warn, locked }`.
  - `streak.ts`: `rollStreak(wallet, today)` runs on app open; it uses freezes or resets and is idempotent. `meetGoal(wallet, today)` adds +1 at most once per date and earns a freeze every 7 days (max 2).
  - `badges.ts`: `BADGES` as data, plus `earnedBadges(stats, owned)`.
  - `rewards.ts`: `lessonRewards(input)` → `{ wallet, newBadges, effects }`. This is the event → `RewardEffect[]` pipeline (architecture §5). Effects come in a fixed order.
- **Data:**
  - The tables already exist in schema v1: `wallet`, `badges`, `dailyActivity`. **No migration is needed.**
  - The per-profile `settings` row gains `dailyGoalMin?` and `dailyLimitMin?`; `null` means the limit is off.
  - New repository sections:
    - `time`: `today`, `addActive(lessonSec, totalSec)`, `addBonus`, `settings`/`setSettings`. Each read-modify-write runs in a transaction, so a tick never overwrites the `goalMet` that a lesson save wrote.
    - `rewards`: `wallet(profileId)`, which rolls the streak and persists it, plus `badges(profileId)`.
  - `lessons.save` now returns `RewardEffect[]`. Wallet, badges and `goalMet` are applied **in the same transaction** as the lesson, so the existing lesson-id idempotency also covers rewards (a re-save → `[]`).
- **UI:**
  - `src/app/TimeProvider.tsx` (the active-time tracker): one 5s interval. It counts only when `visibilityState === 'visible'`, the last input was < 60s ago, and a screen has declared an activity (`useActivity('lesson' | 'map')`). It keeps today's row in memory, so the null store still enforces the limit, and writes through the repos. It exposes `budget`, `grantBonus`, `settings` and `setSettings`. It also renders the heads-up toast.
  - `features/rewards/`:
    - `RewardsQueue` (the CelebrationOrchestrator): the summary step shows the XP count-up and crystals, then one full-screen moment per effect (chest, badge, level up, goal, streak), each with the same bottom CONTINUE.
    - `TopStats` (🔥 💎 ring Lv) on the map header.
    - `GoalRing` (SVG).
    - `TrophyRoom` (`/trophies`).
    - `Goodnight`.
    - `StreakNotice` (freeze-used / new-flame toast on the map).
  - **Locking:**
    - `MapScreen` renders `Goodnight` instead of the map when `budget.locked`.
    - `LessonRoute` checks the lock **once, when the lesson starts**, so a running mission always finishes.
    - After the last reward moment, Continue goes to `/`, which shows Goodnight when locked.
  - **Grown-ups:** a new "Daily time" card with goal/limit pickers, today's minutes and "+10 minutes today".
- **Motion** (motion-design): XP count-up with `gentle`, chest `pop`, flame `bounce`, the ring stroke drawing in. Reduced motion → final values and ≤150ms fades. Every effect has a `sound` key for F09.

## Files
```
src/domain/gamification/{dates,xp,timeBudget,streak,badges,rewards}.ts  (+ exports in domain/index.ts)
src/data/rows.ts                         SettingsRow.dailyGoalMin / dailyLimitMin
src/data/{time,rewards}.ts               dailyActivity + wallet + badge persistence
src/data/repositories/{types,dexie,null}.ts   time + rewards sections; lessons.save → effects
src/data/hooks.ts                        useWallet(), useBadges()
src/app/TimeProvider.tsx, src/app/time.ts (context + useActivity/useTimeBudget)
src/features/rewards/{RewardsQueue,TopStats,GoalRing,TrophyRoom,Goodnight,StreakNotice,HeadsUp}.tsx, copy.ts
src/features/lesson-player/{LessonScreen,LessonComplete,LessonRoute}.tsx
src/features/map/{MapScreen,BottomBar}.tsx   top stats, 🏆 item, goodnight
src/features/grownups/DailyTimeSection.tsx
src/ui/rewards.css (+ tokens)            ring, chest, moments, goodnight sky
tests/unit/domain/{dates,xp,timeBudget,streak,badges,rewards}.test.ts
tests/unit/data/rewards.test.ts, time.test.ts
tests/unit/app/timeProvider.test.tsx, tests/unit/features/rewards.test.tsx
tests/e2e/rewards.spec.ts (+ helpers: finishRewards, seedToday)
```

## Test plan
| AC | Test |
|---|---|
| AC1–AC4 | domain rule tables + fast-check (level monotonic, streak never double-counts a date, freezes ≤ 2) |
| AC5 | `timeBudget` property tests (progress ∈ [0,1], limit off ⇒ never locked, bonus extends) |
| AC6 | TimeProvider with fake timers + mocked `visibilityState` + idle |
| AC7, AC9 | data test: lesson save → wallet/badges/goalMet + effects; re-save → `[]` |
| AC8 | LessonRoute/MapScreen tests: locked at start → Goodnight; locked mid-lesson → finishes |
| AC10 | RewardsQueue component test (order, skip, reduced motion) |
| AC11–AC12 | MapScreen + DailyTimeSection component tests |
| AC13 | `rewards.spec.ts`. E2E seeds today's minutes straight into IndexedDB (`seedToday`) instead of waiting real minutes |

## Risks
- **Outbox growth:** a write every 5s adds about 720 outbox rows per hour of play. That's fine locally. Phase 2 sync coalesces by `rowId`.
- **Existing e2e tests** click Continue once after a lesson. Rewards add moments, so tests use a `finishRewards()` helper.
- **Clock changes:** dates come from `localDate(now)`. `meetGoal` ignores a date ≤ the last streak date, so the streak never goes up twice.
