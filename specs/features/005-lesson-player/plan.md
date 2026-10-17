# Plan — Feature 005 Lesson Player

## Approach
Three layers. Logic stays testable without a browser.

1. **Domain (pure):** `src/domain/engine/lessonSession.ts` is a reducer `(state, event) → state` holding the queue, current question, attempts, staircase, combo and results. It calls `generateQuestion` and `check` from F003. It never touches React or timers; timestamps come in on events.
2. **Feature state:** `src/features/lesson-player/useLesson.ts` is a Zustand store wrapping the reducer. It handles side effects: TTS on new question/feedback, and focus management.
3. **UI:** screens in `src/features/`, generic components in `src/ui/`, math visuals in `src/visuals/`, per-kind renderers in `src/question-kinds/` behind a registry.

### Lesson session state machine
```
            ┌──────────── answer(correct) ───────────┐
 answering ─┤                                         ▼
            └─ answer(wrong) → notYet ─ retry → answering   feedbackCorrect ─ continue ─► next | complete
                               └─ answer(wrong again) → solution ─ continue ─► next (re-queued once) | complete
```
State: `{ skillId, seed, queue: PlannedQuestion[], index, question, phase, attempts, difficulty, firstTryStreak, combo, bestCombo, results[], requeued:Set, startedAt, endedAt? }`.

### Column scratch model (UI only, not graded)
`borrowMarks: Record<place, { value: number; lent: boolean; received: boolean }>`. Tapping a top digit at place p (p ≥ 1):
- if its current value is 0: show bubble "Nothing to trade here. Try the next one!"
- else: value(p) −= 1, value(p−1) += 10, marks updated.

Carry boxes are keypad-editable cells above each column (0/1). Answer cells are filled from the right. Backspace clears the last filled cell. Guided mode derives its text from `solveColumns()` steps for the active column.

### Base-ten blocks scratch model
`{ hundreds, tens, ones, removed: {h,t,o} }`. Break a flat → tens += 10; break a rod → ones += 10; tap to remove when subtracting. The count label is derived. Animation: Motion `layout` + staggered `bounce` for the cubes fanning out; reduced motion swaps instantly.

## Files
```
src/domain/engine/lessonPlan.ts         kind schedule per skill (temporary until F06)
src/domain/engine/lessonSession.ts      pure reducer + selectors (progress, accuracy, bestCombo)
src/domain/engine/hintText.ts           misconception/hint key → template key + slot values from solver steps
content/hints.en.json                   hint & praise copy (hand-written now; F09 regenerates)
src/audio/tts.ts                        speak(text), cancel(), isSupported(); wraps speechSynthesis safely
src/ui/ProgressBar.tsx  Keypad.tsx  ChoiceTile.tsx  FeedbackBanner.tsx  SpeakButton.tsx
src/ui/Kukoos.tsx                       placeholder SVG + mood CSS animations + speech bubble
src/ui/ConfirmSheet.tsx                 "Leave this mission?"
src/visuals/EquationView.tsx  UnitsView.tsx  DigitInPlaceView.tsx
src/visuals/ColumnGrid.tsx              answer cells, carry boxes, borrow marks, guided highlight
src/visuals/BaseTenBlocks.tsx           flats/rods/cubes, break + remove, count labels
src/question-kinds/registry.ts          kind → renderer
src/question-kinds/{Numeric,Mcq,TrueFalse,Compare,Column,TradeBlocks}Question.tsx
src/features/practice/PracticeScreen.tsx
src/features/lesson-player/{LessonScreen,LessonTopBar,LessonComplete,useLesson}.tsx/ts
src/app/routes.tsx                      + /practice, /lesson/:skillId
tests/unit/domain/lessonSession.test.ts, lessonPlan.test.ts, hintText.test.ts
tests/unit/ui/*.test.tsx, tests/unit/question-kinds/*.test.tsx
tests/e2e/lesson.spec.ts                seeded full lesson on 3 devices
```
`tsconfig.e2e.json` gains the `@/*` paths, so Playwright tests can import `@/domain` to compute expected answers.

## Test plan
| AC | Test |
|---|---|
| AC1 | component test of PracticeScreen; e2e navigates shell → picker → lesson |
| AC2 | `lessonSession.test.ts`: determinism, staircase table, re-queue ≤ 12, attempt phases, results |
| AC3 | one component test per renderer: renders, CHECK enablement, emits the right `Response` |
| AC4–AC6 | LessonScreen component tests with a seeded session (correct, not-yet + hint text, solution + re-queue) |
| AC7 | ColumnGrid tests: 403 − 178 borrow sequence, the "nothing to trade" bubble, right-to-left entry, guided highlight |
| AC8 | BaseTenBlocks tests: break rod → counts; reduced-motion path |
| AC9 | tts.ts tests with a mocked `speechSynthesis`, and the unsupported path |
| AC10–AC11 | component tests and e2e |
| AC12–AC13 | e2e on 3 viewports: no scroll, ≥56px targets, keyboard play, reduced motion, console clean |
| AC14 | `lesson.spec.ts` |

## Risks
- **Web Speech quirks** (voices load async; Safari needs a user gesture): speak only after a user gesture (START/tile tap), and fail silently.
- **Column grid complexity:** keep scratch state separate from the answer, so grading stays simple and robust.
- **Scope:** this is the biggest MVP feature (about 12h). Guided-mode yes/no chips and fancier animations are explicitly deferred.
