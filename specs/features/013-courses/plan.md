# Plan — Feature 013 Courses

## Approach
- **Domain** (`src/domain/courses.ts`, pure):
  - `CourseId = 'math' | 'chess'`.
  - `COURSES` with id, name, icon and `timed`.
  - `availableCourses({ chess })`.
  - `profileCourses(courses, available)`, which is never empty.
  - `courseNow(courses, current, available)` and `toggleCourse(courses, id)`, which never leaves a kid with no course.
  - `chessBudget(chessSeconds, limitMin)` → `{ remainingSeconds, locked }`.
- **Availability:** `chessAvailable()` in `src/app/courses.ts` reads `import.meta.env.VITE_CHESS === '1'` at call time, so unit tests can `vi.stubEnv` it. `.env.e2e` sets `VITE_CHESS=1`. Production leaves it unset until F16.
- **Data** (all fields optional and unindexed, so there's no Dexie version bump):
  - `ProfileRow.courses?` and `currentCourse?`. `ProfilePatch` gains both.
  - `SettingsRow.chessLimitMin?`, and `TimeSettings.chessLimitMin?` (absent/null = off). Read and saved with the other time settings.
  - `DailyActivityRow.chessSeconds?`. `TodayTime.chessSeconds` defaults to 0.
  - `repos.time.addChess(profileId, seconds)` (Dexie and null stores).
- **Time:**
  - `Activity` gains `'chess'`. A chess tick calls `addChess` only, so lesson and total seconds don't move.
  - `TimeContext` gains `chess: ChessBudget`.
  - `HeadsUp` still follows the math budget only.
- **Course hook** `useCourses()` (`src/app/courses.ts`) returns `{ available, mine, current, choose(id), setMine(ids) }`. It's built on the current profile, `repos.profiles.update` and `refresh()`.
- **Home** (`MapScreen`): picker, then onboarding, then **the current course**.
  - Chess → `ChessHome`, or `ChessRest` when the chess limit is reached.
  - Math → today's Goodnight check and the `JourneyMap`.
  - Both live at `/` (no new routes), so every "Back to map" link still goes home. *(This deviates from the spec's "home path" in `COURSES`; the field is dropped.)*
- **UI:**
  - `features/courses/CourseSwitcher.tsx`: a `radiogroup` of two chips.
  - `features/courses/CourseCards.tsx`: the picker tiles for onboarding and My courses.
  - `features/chess/ChessHome.tsx` (placeholder) and `ChessRest.tsx`.
  - `TopStats` gains `timed={false}`, which shows only crystals and level.
  - `Goodnight` gains an optional `onChess` button.
- **Onboarding:** when chess is available, the welcome is neutral and there's a `courses` step (Welcome → Courses → Name → Look). On save it writes `courses` and `currentCourse` (math if picked).
- **Me → My courses:** when chess is available, the CourseCards toggle courses, with no PIN.
- **Grown-ups:** when chess is available, the section heading is "Math daily time", plus a "Chess daily limit" select (Off / 15–60).
- **Name:** the manifest `name` and `<title>` become "Kukoos".

## Wireframes
Phone, 360px:
```
Math home (2 courses)                Chess home (placeholder)
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ (av) Hi, Comet!        🔇   │     │ (av) Hi, Comet!        🔇   │
│ [🔢 Math ✓] [♞ Chess ]      │     │ [🔢 Math ] [♞ Chess ✓]      │
│ [🔥 3][💎 20][◔ 4/10][Lv 2] │     │ [💎 20]         [⭐ Lv 2]   │
│  …journey map…              │     │   Kukoos (knight helmet)    │
│                             │     │  "Chess Castle is being     │
│                             │     │   built! Come back soon."   │
└─────────────────────────────┘     └─────────────────────────────┘
```
Tablet (768px+) uses the same column, centred at `--mq-content-max`.

Onboarding "What do you want to learn?": Kukoos with a bubble, two big tiles (🔢 Math, ♞ Chess) that toggle with a ✓, and a "Next" button that's disabled until at least one is picked.

## States
| Component | States |
|---|---|
| Switcher chip | default, current (`aria-checked`, primary tint), pressed |
| Course tile | default, selected ✓, pressed, last-one-left (selected, says "You need at least one" when tapped) |
| Chess home | loading (null), open, resting (chess limit) |
| Goodnight | math-only (today's), with chess offer |

## Test plan
| AC | Test |
|---|---|
| AC1 | `courses.test.ts` (registry, available, profileCourses fallback, toggle never empty, chessBudget) |
| AC2 | `profiles.test.ts` and `time.test` additions (old rows → math, chessSeconds and chessLimitMin round-trip), backup round-trip |
| AC3 | `timeProvider.test.tsx` (chess ticks add only chessSeconds), `courses.test.tsx` (math locked → Goodnight offers chess; chess limit → resting) |
| AC4 | `courses.test.tsx` (chess home shows the shared crystals and level) |
| AC5 | `onboarding` tests with `vi.stubEnv('VITE_CHESS', '1')` and without |
| AC6 | switcher unit test plus e2e |
| AC7 | `meScreen` test (toggle, never empty, removing current switches) |
| AC8 | existing suites, `shell.spec.ts` manifest name |
| AC9 | `courses.spec.ts` |

## Risks
- **e2e now builds with chess on.** The onboarded fixture must pick Math in the new step, so existing flows stay identical.
- **Header crowding on phones:** the switcher takes its own full-width row under the greeting, and the stats grid keeps its row.
