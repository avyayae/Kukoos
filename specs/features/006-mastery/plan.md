# Plan — Feature 006 Mastery, Spaced Review & Adaptive Lessons

## Approach
All rules are pure functions in `src/domain/engine`, and data and UI only call them.
```
attempt results ──► mastery.applyLesson(prev, results, at) ──► SkillMastery (per skill)
SkillMastery map + focus skill + now + seed ──► lessonComposer.composeLesson ──► PlannedQuestion[]
PlannedQuestion[] ──► lessonSession.startLesson({ plan }) ──► (existing reducer)
startingPoint.prereqClosure(skill) ──► preMastered states ──► progress repo
```

### Domain types
```ts
interface SkillMastery {           // mirrors SkillProgressRow minus sync fields
  mastery: number; attempts: number; sessionsSeen: number
  srsBox: 1|2|3|4|5; nextReviewAt: number; crowned: boolean; preMastered: boolean
}
interface PlannedQuestion { skillId; kind; guided; seed; fixedDifficulty?; isRequeue; role: 'focus'|'review'|'stretch' }
interface QuestionResult { …existing, skillId }
```
`startLesson({ skillId, seed, at, plan?, difficulty? })`: when `plan` is given it's used as-is. Without a plan, the composer runs with empty progress (new-skill behaviour), which keeps F005 callers and tests working.

### Composer algorithm (deterministic for a seed)
1. `m` = focus mastery (0 if unseen). Kinds come from the mastery band table, filtered to `skill.kinds`, padded by rotating the supported kinds.
2. Reviews: due crowned skills (not the focus), sorted by `nextReviewAt` ascending, take 2. Each gets `numeric` or `mcq` (whichever the skill supports, alternating) at difficulty 3.
3. Stretch: if `m ≥ 0.5`, one focus question with `fixedDifficulty = start + 1` (max 5).
4. Assemble 10 slots: focus questions, with reviews inserted at positions 3 and 6 and the stretch at position 8.
5. Seeds: `seed * 1000 + i`, as before.

### Data
- `skillProgress` row id = `${profileId}:${skillId}` (deterministic, so there's one row per kid per skill).
- `lessons.save()` extends its transaction to `[lessons, attempts, skillProgress, outbox]`. After writing the lesson and attempts, it groups results by `skillId`, loads the existing progress rows, applies `mastery.applyLesson`, and writes them via `writeRows` (version bump + outbox). The idempotency check stays first, so a re-save doesn't double-count.
- `progress.forProfile(profileId)` → `Record<SkillId, SkillMastery>`.
- `progress.applyStartingPoint(profileId, skillId, at)` → pre-master the prerequisite closure with `max()` semantics.

### UI
- `useProgress()` hook (data layer): the live map for the current profile.
- `LessonRoute`: waits for profile and progress, then `composeLesson` (or `composeReview` for `/lesson/review`) and renders `LessonScreen` with the plan. `LessonScreen` takes `plan` and `focusSkillId`.
- `PracticeScreen`: 👑 / "New!" / mastery ring; "🔁 Review (N)" card at the top when N ≥ 1.
- `GrownUpsScreen` (was BackupScreen) at `/grown-ups`: Starting point section (select in path order + Apply, with a confirm) above Backup and Restore. `/backup` redirects there.
- Testing clock: `?now=<ms>` on lesson and picker routes, **dev/e2e only** (ignored unless `import.meta.env.DEV` or the e2e flag), so e2e can make reviews due.

## Files
```
src/domain/engine/mastery.ts            constants, applyAnswer, applyLesson, crown rules, SRS, isDue
src/domain/engine/startingPoint.ts      prereqClosure, preMasteredState
src/domain/engine/lessonComposer.ts     composeLesson, composeReview, kindsForMastery, startDifficulty
src/domain/engine/lessonSession.ts      plan input, per-question skillId (+ results)
src/domain/engine/lessonPlan.ts         removed (superseded by composer) or delegates to it
src/data/rows.ts                        SkillProgressRow + preMastered
src/data/mappers.ts                     attempts use result.skillId
src/data/repositories/{types,dexie,null}.ts   progress repo + save updates progress
src/data/hooks.ts                       useProgress()
src/features/lesson-player/LessonRoute.tsx    compose from progress; /lesson/review
src/features/lesson-player/LessonScreen.tsx   plan + focusSkillId props
src/features/practice/PracticeScreen.tsx      crowns, review card, mastery ring
src/features/grownups/GrownUpsScreen.tsx      starting point + backup (moved)
src/app/routes.tsx                      /grown-ups, /backup redirect
tests/unit/domain/{mastery,startingPoint,lessonComposer}.test.ts
tests/unit/data/progress.test.ts
tests/unit/features/{practiceProgress,grownups}.test.tsx
tests/e2e/mastery.spec.ts
```

## Test plan
| AC | Test |
|---|---|
| AC1–AC2 | `mastery.test.ts`: tables + fast-check bounds |
| AC3–AC5 | `lessonComposer.test.ts`: band tables, due ordering, stretch, determinism, kind support for every skill × band |
| AC6 | `lessonSession.test.ts`: mixed-skill plan, results skillId, re-queue keeps skill |
| AC7–AC8 | `progress.test.ts`: atomic update, idempotent re-save, starting point closure, max semantics |
| AC9–AC10 | component tests with a seeded store |
| AC11 | `mastery.spec.ts` on 3 devices |
| AC12 | backup from F004 shape imports fine; mapper fallback test |

## Risks
- **Plan depends on async progress:** the lesson must not start before progress loads, or seeds and plans would differ. LessonRoute renders nothing until it's ready (a few ms).
- **Test clock leaking into production:** `?now` is only honoured in dev/e2e builds (checked via an env flag set by Playwright's webServer).
