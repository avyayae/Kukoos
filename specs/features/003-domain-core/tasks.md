# Tasks — Feature 003 Domain Core

Branch: `feature/003-domain-core`. Run `npm run verify` before ticking any task.

- [x] **T1 — Types** · `src/domain/types.ts` (skills, questions, answers, responses, check results, hints, misconception keys, patterns). · *done when:* typecheck passes, and `index.ts` exports them.
- [x] **T2 — Speech** · `numberToWords` (0–1000) and `equationToSpeech`. · *done when:* `speech.test.ts` is green (AC11).
- [x] **T3 — Curriculum** · `worlds.ts`, `skills.ts` (23 skills from the skill map), `skillGraph.ts`. · *done when:* `skillGraph.test.ts` is green (AC1, AC2).
- [x] **T4 — Column solver** · `digits.ts`, `solveColumns.ts`. · *done when:* exhaustive 2-digit + property 3-digit tests are green (AC3).
- [x] **T5 — Pattern classifier + constructive sampler** · `regroupPattern.ts`, `sampleOperands.ts`. · *done when:* the spec table examples classify correctly, and `classify(sample(p, d)) === p` for every pattern × difficulty × 1000 seeds (AC4).
- [x] **T6 — Misconceptions** · `simulateBugs`, `detectMisconception`, priority. · *done when:* every catalog example is detected as listed (AC8).
- [x] **T7 — Distractors** · `pickDistractors` (bugs first, then offBy; excludes `wroteWholeSum`). · *done when:* `distractors.test.ts` is green (AC9 unit part).
- [x] **T8 — Generators: basic facts** · within-20 add/sub (numeric, mcq, trueFalse). · *done when:* their part of the sweep is green.
- [x] **T9 — Generators: column arithmetic** · all add/sub column skills (numeric, column, tradeBlocks, mcq, trueFalse), driven by `skill.pattern`. · *done when:* their part of the sweep is green.
- [x] **T10 — Generators: mixed** · `addsub.within100.mixed`, `addsub.3digit.mixed` incl. missing-number at difficulty ≥ 4. · *done when:* their part of the sweep is green.
- [x] **T11 — Generators: place value** · `pv.*` (incl. trade tens/hundreds, compare). · *done when:* their part of the sweep is green.
- [x] **T12 — check()** · numeric/choice/boolean/comparison + column `stepErrors` + misconception. · *done when:* `check.test.ts` is green (AC8, AC10).
- [x] **T13 — Registry & full sweep** · `registry.ts`, `generateQuestion`, completeness guard (every MVP skill has a generator for each declared kind), determinism, performance test, coverage threshold. · *done when:* AC5, AC6, AC7 and AC12 are green.
- [ ] **T14 — Docs & wrap-up** · Update the skill map's misconception catalog and the product spec example, record deviations, push the branch and open a PR. · *done when:* CI is green on the PR.
