# Plan — Feature 011 Parent Zone

## Approach
- **PIN (data, `src/data/pin.ts`):** a `pinHash` and `pinSalt` on the `global` settings row. SHA-256 (Web Crypto) over `salt + pin`; the salt comes from `crypto.getRandomValues`. Repo section `device.hasPin()`, `setPin(pin)`, `checkPin(pin)`.
- **Gate (UI, `features/grownups/PinGate.tsx`):**
  - States: `create` → `confirm` → unlocked; `enter` (5 tries, then a 30s pause) → unlocked; `forgot` (2-digit × 2-digit typed answer) → `create`.
  - It reuses `Keypad` and the existing in-memory `GrownUpGateContext` (unlocked for this visit). A **Lock** button on the Grown-ups header calls `lock()`.
  - `makeGateQuestion` is removed. A `makeRecoveryQuestion` helper takes injectable randomness.
- **Report (domain, `src/domain/report.ts`):** pure aggregation over plain records (attempt, lesson, day, progress, badge), using `localDate` for days. `MISCONCEPTION_LABELS` live in the UI copy.
- **Data:** `reports.forProfile(profileId)` returns the raw rows (attempts, lessons, dailyActivity, progress, badges) for the last 14 days or all time; `profiles.reset(id)` shares the delete logic with `remove`.
- **UI:**
  - `features/grownups/ProgressScreen.tsx` at `/grown-ups/progress`: kid tabs, summary tiles, `MinutesChart` (SVG), `AccuracyRow`, `MasteryHeatmap`, `NeedsPractice`, `Mistakes`, recent badges.
  - The Grown-ups home gets a progress card at the top.
  - Profiles gets a "Reset progress…" button.

## Test plan
| AC | Test |
|---|---|
| AC1 | `pin.test.ts` (hash not plain, check right/wrong, per-device salt) |
| AC2–AC5 | `pinGate.test.tsx` (create/confirm mismatch, wrong/cooldown with fake timers, forgot flow, lock) |
| AC6 | `report.test.ts` (fixtures: days, accuracy, misconception counts, needs-practice ordering) |
| AC7 | `progressScreen.test.tsx` (seeded store) |
| AC8 | data test (reset keeps profile + avatar, clears progress) |
| AC9 | `parent.spec.ts` |

## Risks
- **Every existing test** uses the multiplication gate. The unit `passGate()` and e2e `passGate()` helpers become "set or enter the PIN" (test PIN 2468), so call sites don't change.

## Deviations (recorded during implementation)
- **Data hooks are keyed by profile id.** While building the per-kid dashboard, we saw that `useProgress`/`useJourney`/`useWallet`/`useBadges`/`useBestScores` could briefly show the previous kid's data right after a switch. They now share one `useProfileData` loader that reports "loading" until the current kid's data arrives (this fixes spec 010 AC5).
- **E2E slip:** `parent.spec.ts` drives a seeded `sub.within100.regroup` lesson with a mirror of the lesson reducer, so the smaller-from-larger answer lands exactly on the first column question.
