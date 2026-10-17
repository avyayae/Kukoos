# Tasks — Feature 005 Lesson Player

Branch: `feature/005-lesson-player`. Load the `mathquest-ui` skill for every UI task. Run `npm run verify` before ticking.

- [ ] **T1 — Lesson plan + session reducer (domain)** · `lessonPlan.ts`, `lessonSession.ts`. · *done when:* `lessonSession.test.ts` covers determinism, staircase, attempts, re-queue and results (AC2).
- [ ] **T2 — Hint text** · `hintText.ts` + `content/hints.en.json` (misconception and skill hints, praise by world theme). · *done when:* slot values come from solver steps (e.g. 36 − 28 → "take 8 from 6"), tested.
- [ ] **T3 — TTS** · `src/audio/tts.ts` with safe fallbacks + `SpeakButton`. · *done when:* mocked-speech tests pass (AC9).
- [ ] **T4 — UI primitives** · ProgressBar, Keypad (pointer + physical keys), ChoiceTile, FeedbackBanner, Kukoos (moods + bubble), ConfirmSheet. · *done when:* component tests cover their states and reduced motion.
- [ ] **T5 — Displays** · EquationView, UnitsView, DigitInPlaceView. · *done when:* they render every `Display` variant from the sweep (snapshot by type).
- [ ] **T6 — Numeric, MCQ, True/False, Compare renderers** + registry. · *done when:* each emits the right `Response` and gates CHECK (AC3).
- [ ] **T7 — ColumnGrid + ColumnQuestion** (answer cells, carry boxes, borrow marks, guided mode). · *done when:* AC7 tests pass.
- [ ] **T8 — BaseTenBlocks + TradeBlocksQuestion.** · *done when:* AC8 tests pass.
- [ ] **T9 — LessonScreen + top bar + store** (flow, feedback, SHOW ME, solution, re-queue, exit confirm, auto-read toggle). · *done when:* AC4–AC6 and AC11 component tests pass.
- [ ] **T10 — Lesson complete + Practice picker + routes.** · *done when:* AC1 and AC10 tests pass.
- [ ] **T11 — E2E** · `lesson.spec.ts` seeded run on 3 devices + layout/keyboard/reduced-motion/console checks; screenshots reviewed at 360/768/1280 in light and dark. · *done when:* AC12–AC14 pass.
- [ ] **T12 — Wrap-up** · deviations, run locally for you, push the branch, open a PR, CI green.
