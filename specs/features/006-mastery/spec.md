# Feature 006 — Mastery, Spaced Review & Adaptive Lessons

**Status:** Implemented. All ACs are verified locally; CI is pending on the PR.  ·  **Constitution check:** §2.1 mastery-based progression, §2.2 spaced review, §2.3 adaptive difficulty (~80% success), §2.4 concrete → pictorial → abstract (kind chosen by mastery), §3.2 pure domain (all rules in `src/domain/engine`), §3.5 sync-ready (`skillProgress` rows via the outbox)

## Why
Today every lesson for a skill looks the same: blocks, then guided columns, then free practice, starting at difficulty 2, however well she already knows it. And nothing ever says "you've got this one". F06 makes the app **learn the learner**:
- It tracks **mastery** per skill from her saved answers.
- It **crowns** a skill when she has really mastered it (not just visited it once).
- It brings crowned skills back on a **spaced-review** schedule, so they stick.
- It **builds each lesson** from what she knows: blocks while a skill is new, guided columns while it's forming, free practice once it's solid, plus a couple of quick reviews of older skills.
- Since she already knows within-100 add/sub without regrouping, a grown-up can set a **starting point**. Earlier skills count as known and only come back as quick reviews.

## User stories
- As a **kid**, I want a 👑 on a mission when I've really mastered it, so I can see my progress.
- As a **kid**, I want lessons that get harder as I get better and help more when a skill is new.
- As a **kid**, I want a short "Review" mission with a few old skills, so I don't forget them.
- As a **parent**, I want to set where she starts (e.g. "Savanna Carry Camp"), so she doesn't redo what she already knows.
- As the **developer**, I want all mastery, review and lesson-building rules as pure, tested domain functions, so the world map (F07), rewards (F08) and parent dashboard (F11) can reuse them.

## Rules (from `specs/02-curriculum-skill-map.md`, made precise)
### Mastery (per skill, 0–1)
- After each question on a skill, `m ← m + α·(score − m)`, where:
  - score = 1 (right first try), 0.5 (right after a hint/retry), 0 (not solved)
  - α = 0.15 × (0.8 + 0.1 × difficulty), so harder questions move mastery a bit more (d1 → 0.135, d5 → 0.195)
- **Crowned** when m ≥ 0.85 **and** ≥ 15 questions **across** ≥ 2 lessons.
- **Un-crowned** only when m < 0.70 (a gap, so a single slip doesn't flicker the crown).
### Spaced review (Leitner, crowned skills)
- Boxes 1–5 with intervals **1, 2, 4, 7, 14 days**.
- After a lesson that included a skill: if that skill's first-try accuracy in the lesson ≥ 80% → box + 1 (max 5), else → box 1. Then `nextReviewAt = lesson end + interval(box)`.
- A crowned skill is **due** when `now ≥ nextReviewAt`.
### Building a lesson (replaces F005's fixed kind order)
- **10 questions:** focus skill ×7–8, **up to 2 due reviews** (most overdue first, other crowned skills), and **1 stretch** (focus skill at +1 difficulty) once the focus mastery ≥ 0.5.
- **Kind by focus mastery** (concrete → pictorial → abstract), using only kinds the skill supports:

  | Focus mastery | Kinds |
  |---|---|
  | < 0.3 (new) | blocks ×3, guided column ×3, then numeric / mcq |
  | 0.3–0.6 (forming) | guided column ×2, column ×3, numeric, mcq, trueFalse |
  | > 0.6 (solid) | column / numeric / mcq / trueFalse mix, no blocks, no guided |

  Skills without blocks or columns (facts, place value, compare) rotate their own kinds.
- **Start difficulty** = 1 + round(m × 3) (1–4), and the in-lesson staircase still adapts.
- Review questions use `numeric` / `mcq` at difficulty 3.
- **Review mission:** when ≥ 1 skill is due, the picker shows a "🔁 Review" card that builds a lesson of up to 10 due-skill questions (round-robin, most overdue first).
### Starting point
- A grown-up picks a starting skill. All of its **transitive prerequisites** become **pre-mastered**: m = 0.9, crowned, box 3, next review in 4 days, `preMastered: true`. They come back as quick reviews, and real answers can un-crown them like any other skill.
- Changing the starting point later only **adds** pre-mastery. It never removes earned progress.

## Scope
- **Domain (pure):** `mastery.ts` (update, crown, SRS, due), `lessonComposer.ts` (focus/review/stretch plans, kind by mastery, start difficulty), `startingPoint.ts` (prerequisite closure, pre-mastered state). `lessonSession` accepts a composed plan, where each planned question has its own `skillId`. `QuestionResult` gains `skillId`.
- **Data:** `skillProgress` rows. Saving a lesson **updates progress for every skill in it, in the same transaction**, plus outbox entries. Repos: `progress.forProfile()`, `progress.applyStartingPoint()`.
- **UI:**
  - Picker: 👑 on crowned skills, "🔁 Review (N)" card when reviews are due, "Practice!" or a mastery ring on started skills.
  - The lesson route waits for progress, then composes the plan.
  - The grown-up screen gets a **Starting point** picker. It's renamed from "Backup & restore" to "**Grown-ups**", and its route moves to `/grown-ups`, with `/backup` redirecting.

## Acceptance criteria
- **AC1 — Mastery update:** the formula, crown/un-crown thresholds and 15/2 requirement hold. A table-driven test covers first-try, after-retry, unsolved, and each difficulty's α. Property: m always stays in [0, 1].
- **AC2 — SRS:** box moves and `nextReviewAt` follow the table (≥ 80% → +1 capped at 5; otherwise → 1). `isDue` is exact at the boundary.
- **AC3 — Composer, new skill:** with no progress, a column skill's lesson is blocks ×3 → guided column ×3 → numeric/mcq, at difficulty 1, with no reviews and no stretch.
- **AC4 — Composer, solid skill with due reviews:** with focus m = 0.7 and 3 due crowned skills, the lesson has 10 questions: ≤ 2 reviews (the 2 most overdue), 1 stretch at +1 difficulty, no blocks or guided, and every kind is supported by its skill. Deterministic for a seed.
- **AC5 — Review mission:** `composeReview` returns ≤ 10 questions spread over due skills, most overdue first. With nothing due it returns `[]`.
- **AC6 — Lesson session with mixed skills:** a composed plan with review questions plays through the existing reducer. Each result records its own `skillId` and difficulty, and re-queues keep their skill.
- **AC7 — Progress saved atomically:** saving a lesson updates `skillProgress` for each skill in it (mastery, attempts, sessionsSeen + 1, box, nextReviewAt, crowned) in the same transaction as the lesson, attempts and outbox. Re-saving the same lesson changes nothing.
- **AC8 — Starting point:** applying "Savanna Carry Camp → Trade a ten" pre-masters exactly its transitive prerequisites (the 4 jungle skills). It never lowers existing mastery, and applying twice is a no-op.
- **AC9 — Picker:** crowned skills show 👑. "🔁 Review (N)" appears only when N ≥ 1 and opens `/lesson/review`. Unplayed skills keep "New!".
- **AC10 — Grown-ups screen:** the starting-point select lists the skills in path order. Choosing one and confirming applies it, and the picker shows the jungle skills crowned. `/backup` redirects to `/grown-ups`.
- **AC11 — E2E:** on a fresh device, set the starting point to "Trade a ten for ones", and the jungle skills show 👑. Play "Subtract with borrowing" and its first question is trade blocks (new skill). Use the clock to make reviews due, and the Review card appears and plays.
- **AC12 — Back-compat:** existing lessons and backups keep working. F004's schema already has `skillProgress`, so there's no migration. Old attempt rows without a per-question `skillId` fall back to the lesson's skill.

## Out of scope
- World map and node locking (F07): the picker stays open-access, with badges only.
- XP, gems, streaks, celebrations for crowns (F08). The 👑 appears statically now.
- Parent dashboard charts (F11).

## Decisions (approved 2026-10-17)
1. The starting point lives on the **Grown-ups** screen until onboarding (F10).
2. Crown hysteresis: un-crown below **0.70**.
3. The picker stays open-access (badges only) until the world map (F07).
