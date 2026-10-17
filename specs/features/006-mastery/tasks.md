# Tasks — Feature 006 Mastery, Spaced Review & Adaptive Lessons

Branch: `feature/006-mastery`. Run `npm run verify` before ticking. Load `mathquest-ui` for UI tasks.

- [ ] **T1 — Mastery + SRS (domain)** · `mastery.ts`. · *done when:* AC1, AC2 tests pass.
- [ ] **T2 — Starting point (domain)** · `startingPoint.ts`. · *done when:* prerequisite-closure and pre-mastered state tests pass.
- [ ] **T3 — Lesson composer (domain)** · `lessonComposer.ts` (focus / review / stretch, kind bands, start difficulty, review mission). · *done when:* AC3, AC4, AC5 pass.
- [ ] **T4 — Session with mixed skills** · plan input, per-question `skillId`, results; replace `lessonPlan`. · *done when:* AC6 passes and existing session tests still pass.
- [ ] **T5 — Progress persistence** · `skillProgress` writes inside `lessons.save`, `progress.forProfile`, `applyStartingPoint`, null repo. · *done when:* AC7, AC8, AC12 pass.
- [ ] **T6 — Lesson route + screen** · compose from progress, `/lesson/review`, dev/e2e clock. · *done when:* component tests pass.
- [ ] **T7 — Picker** · 👑, review card, mastery ring. · *done when:* AC9 passes.
- [ ] **T8 — Grown-ups screen** · starting point + backup; `/backup` → `/grown-ups`. · *done when:* AC10 passes.
- [ ] **T9 — E2E** · `mastery.spec.ts` + existing suites green; screenshots reviewed. · *done when:* AC11 passes on 3 devices.
- [ ] **T10 — Wrap-up** · deviations, run locally, push the branch, open a PR, CI green.
