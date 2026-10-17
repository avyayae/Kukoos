# Feature 003 — Domain Core: Curriculum, Column Arithmetic, Misconceptions & Generators

**Status:** Implemented. All ACs are verified locally; CI is pending on the PR.  ·  **Constitution check:** §2.4 concrete → pictorial → abstract (question kinds per skill), §2.5 curriculum fidelity (every skill has a CCSS code), §3.2 pure domain (no React/storage), §3.3 correctness is provable (seeded + property-tested), §3.4 code computes every answer

## Why
Everything a kid sees in a lesson comes from this layer: which skills exist, how they unlock, the questions, the right answer, and **why** a wrong answer is wrong. The focus area for our first player is regrouping (`36 − 28`, `403 − 178`). The engine has to (a) produce problems that regroup in exactly the columns a skill targets, and (b) recognize the classic regrouping bugs, so that Kukoos can give a targeted hint rather than "try again".

If this layer is wrong, the app teaches wrong math. So it's pure TypeScript, deterministic, and covered by exhaustive and property-based tests before any UI uses it.

## User stories
- As a **kid**, I want each question to practice exactly the skill I'm on (e.g., "borrow from the tens only") so that I build one idea at a time.
- As a **kid**, when I make a common mistake (e.g., 36 − 28 = 12), I want a hint about *that* mistake so that I understand what went wrong.
- As a **kid**, I want multiple-choice options that look like real mistakes (not random numbers) so that choosing correctly means I really understand.
- As a **parent**, I want the app to log *which* mistake happened so that the dashboard can show "smaller-from-larger: 6 times this week".
- As the **developer**, I want `generateQuestion(skillId, { difficulty, kind, seed })` to be deterministic so that any question can be reproduced from its id.

## Scope: the 23 MVP skills
Exactly the ✅ skills of `specs/02-curriculum-skill-map.md`, Worlds 1–5:

| World | Skills |
|---|---|
| 1 Jungle Warm-up | `add.within20`, `sub.within20`, `add.within100.noregroup`, `sub.within100.noregroup` |
| 2 Savanna Carry Camp | `pv.tradeTens`, `add.within100.regroup`, `sub.within100.regroup`, `addsub.within100.mixed` |
| 3 Ocean Reef | `pv.hundredsTensOnes`, `pv.expandedForm`, `pv.compare3digit`, `pv.plus10plus100`, `pv.tradeHundreds` |
| 4 Moon Base | `add.3digit.noregroup`, `add.3digit.carryOnes`, `add.3digit.carryTens`, `add.3digit.carryBoth` |
| 5 Mars Crater | `sub.3digit.noregroup`, `sub.3digit.borrowTens`, `sub.3digit.borrowHundreds`, `sub.3digit.borrowBoth`, `sub.3digit.acrossZero`, `addsub.3digit.mixed` |

## Regrouping patterns (the contract generators must satisfy)
Columns are indexed ones = 0, tens = 1, hundreds = 2. `a` is the top operand and `b` the bottom.

| Pattern | Rule | Example |
|---|---|---|
| `add.none` | every column sum (with incoming carry) < 10 | 324 + 152 |
| `add.carryOnes` | ones carry; tens and hundreds don't | 348 + 237 |
| `add.carryTens` | ones don't carry; tens carry; total < 1000 | 362 + 175 |
| `add.carryBoth` | ones and tens both carry; total < 1000 | 478 + 356 |
| `sub.none` | every column `aᵢ ≥ bᵢ` | 587 − 243 |
| `sub.borrowTens` | ones borrow from a non-zero tens; tens doesn't then need to borrow | 652 − 318 |
| `sub.borrowHundreds` | ones don't borrow; tens borrows from hundreds | 528 − 263 |
| `sub.borrowBoth` | ones borrow, then tens must also borrow; no zero tens digit | 723 − 458 |
| `sub.acrossZero` | ones borrow and `a`'s tens digit is 0 (or tens and ones are both 0) | 403 − 178, 500 − 263 |

Subtraction answers are always ≥ 0 (and > 0 unless a skill says otherwise). Addition sums are always < 1000.

## Misconception catalog (replaces the draft catalog in the skill map)
Each bug is **simulated** by a pure function `simulateBugs(a, b, op)` that returns the answer a kid making that mistake would give. Detection is then exact: if the kid's answer equals a simulated bug answer (and isn't the correct answer), that's the misconception. **Multiple-choice and true/false distractors are drawn from the same simulations.**

| Key | Applies to | Simulation | Example (correct) |
|---|---|---|---|
| `sub.smallerFromLarger` | subtraction | per column `|aᵢ − bᵢ|`, no borrowing | 36 − 28 → **12** (8) |
| `sub.borrowNoDecrement` | subtraction | if `aᵢ < bᵢ` use `aᵢ + 10 − bᵢ`, but never reduce the next column | 52 − 28 → **34** (24); 403 − 178 → **335** (225) |
| `sub.acrossZeroSkip` | subtraction with a 0 to borrow across | borrow correctly, but the zero column becomes 10 instead of 9 | 403 − 178 → **235** (225); 500 − 263 → **247** (237) |
| `add.forgotCarry` | addition | per column `(aᵢ + bᵢ) mod 10`, carries dropped | 47 + 38 → **75** (85) |
| `add.wroteWholeSum` | addition | writes each column's full sum side by side | 47 + 38 → **715** (85) |
| `wrongOperation` | add & sub | added instead of subtracted, or vice versa | 36 − 28 → **64** (8) |
| `offByOne` | all numeric | `|answer − correct| = 1` | 85 → 84 |
| `offByTen` | all numeric | `|answer − correct| ∈ {10, 100}` | 225 → 325 |

**Priority** when two bugs produce the same number: the order of the table (algorithmic bugs first, then the generic `offBy*`). A bug whose simulated answer equals the correct answer never fires.
*Known collision:* when `bᵢ − aᵢ = 5` in a borrowing column, `smallerFromLarger` and `borrowNoDecrement` give the same digit (52 − 27 → 35 for both). Priority reports `smallerFromLarger`.

## Acceptance criteria
- **AC1 — Curriculum data:** Given `skills.ts`, then all 23 MVP skills exist with a world, title, ≥1 CCSS code, prereqs, supported question kinds, and (for column skills) a regrouping pattern. The prereq graph is acyclic, references only existing skills, and each world's first skill depends only on the previous world.
- **AC2 — Unlocks:** Given a set of mastered skill ids, when `unlockedSkills(mastered)` runs, then it returns exactly the skills whose prereqs are all mastered (plus skills with no prereqs).
- **AC3 — Column solver:** Given any `a, b` in 0–999 (with `a ≥ b` for subtraction and `a + b < 1000` for addition), then `solveColumns(a, b, op)` returns per-column steps (top digit after borrowing, carry in/out, borrow, result digit) whose digits rebuild exactly `a + b` or `a − b`. Every 2-digit pair is tested exhaustively; 3-digit pairs are property-tested.
- **AC4 — Pattern classifier:** `regroupPattern(a, b, op)` returns the pattern from the table above, and for every example in that table it returns the listed pattern.
- **AC5 — Generators respect the skill:** For every skill × difficulty (1–5) × supported kind × 500 seeds, the generated question satisfies its skill's constraints: operand ranges, the regrouping pattern for column skills, non-negative results, sum < 1000. Its `answer` equals an independent recomputation.
- **AC6 — Determinism:** The same `(skillId, difficulty, kind, seed)` always gives a deep-equal question, and the question `id` encodes all four.
- **AC7 — Termination & speed:** Generators are constructive (no unbounded retry loops). Generating 10,000 questions across all skills takes < 1s on CI.
- **AC8 — Misconception detection:** Given a subtraction/addition question and a kid's answer, `check()` returns `correct: true` only for the right answer. For a wrong answer it returns the first matching misconception key by priority, and every example in the catalog table is detected as listed.
- **AC9 — Distractors:** MCQ questions have 3–4 unique, non-negative choices including the correct answer. Distractors prefer simulated bug answers, then `offBy*` values. `trueFalse` questions use a bug answer for their "false" variant.
- **AC10 — Column responses:** Given a `column` question and a digit-by-digit response (ones first), `check()` reports `stepErrors` for each column whose digit differs from the solver's digit, plus the overall misconception.
- **AC11 — Speech text:** Every question has `prompt.speech` with numbers in words ("thirty-six minus twenty-eight"). `numberToWords` is correct for 0–1000.
- **AC12 — Purity:** All of this lives in `src/domain/**`, passes the domain-purity lint rules, and has 100% line coverage on `src/domain/arithmetic/**`.

## Question kinds per skill
| Skills | Kinds |
|---|---|
| `add/sub.within20` | `numeric`, `mcq`, `trueFalse` |
| `add/sub.within100.*`, `add/sub.3digit.*` | `numeric`, `column`, `tradeBlocks`, `mcq`, `trueFalse` |
| `addsub.*.mixed` | `numeric`, `column`, `mcq` (+ missing-number form at difficulty ≥ 4) |
| `pv.tradeTens`, `pv.tradeHundreds` | `tradeBlocks`, `numeric`, `mcq` |
| `pv.hundredsTensOnes`, `pv.expandedForm`, `pv.plus10plus100` | `numeric`, `mcq` |
| `pv.compare3digit` | `compare` |

Which kind to use when (blocks → guided column → free) is decided by the lesson composer in F06, not here. Generators accept any supported kind and reject unsupported ones.

## Difficulty (1–5), general rules
- **1:** friendliest numbers. The second operand has one fewer digit (e.g., 652 − 38), digits avoid 0, and regrouping columns are "near" (e.g., 6 + 5).
- **2–3:** full range for the skill's pattern.
- **4:** zeros allowed inside operands (e.g., 405 + 278), and missing-number forms for `mixed` skills.
- **5:** hardest in-pattern cases. Column skills use "far" regrouping (column sums ≥ 15, borrow gaps ≥ 4) with zeros allowed, so internal-zero answers like 512 − 307 = 205 occur naturally rather than being forced. Compare uses swapped digits (452 vs 425) or equal numbers.

Each generator documents its exact difficulty table in code, and AC5 tests that the table holds.

## Out of scope
- UI renderers, blocks/column interaction (F05).
- Mastery, spaced repetition, lesson composition, choosing the kind by mastery (F06).
- Hint *wording* and TTS voice lines (build-time content, F09). The domain returns hint **keys** plus structured data (e.g., worked-example steps).
- Word problems (Phase 2).

## Decisions (approved 2026-10-16)
1. **Missing-number forms** (`? − 28 = 8`): only `offByOne`/`offByTen` are detected. Bug simulation for unknown operands is ambiguous.
2. **`add.wroteWholeSum`** is detected but never used as an MCQ/true-false distractor.
