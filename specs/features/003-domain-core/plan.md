# Plan — Feature 003 Domain Core

## Approach
Everything is pure TypeScript under `src/domain/`, with no dependencies beyond `rng.ts`. The design keeps **one source of truth per fact**:
- **Digits and regrouping** come only from `solveColumns()`. The pattern classifier, worked-example hints and column `stepErrors` all derive from it.
- **Bug behavior** comes only from `simulateBugs()`. Detection and distractors both use it, so "what Kukoos recognizes" and "what MCQ offers" can never drift apart.
- **Skill rules** come only from `skills.ts` data. Generators read their pattern/kinds/ranges from the skill record, and tests iterate over the same records.

### Constructive operand sampling (AC7)
No "generate random, reject until it matches" loops. For a column pattern, build operands **digit by digit from the ones column up**, choosing each digit pair from the set that satisfies that column's rule given the incoming carry/borrow:
- `add`, column must carry: choose `aᵢ`, then `bᵢ ∈ [10 − carryIn − aᵢ, 9]` (non-empty by choosing `aᵢ ≥ 1 − carryIn`).
- `add`, column must not carry: `bᵢ ∈ [0, 9 − carryIn − aᵢ]`.
- `sub`, column must borrow: `aᵢ ∈ [0, 8]`, `bᵢ ∈ [aᵢ − borrowIn + 1, 9]`.
- `sub`, column must not borrow: `bᵢ ∈ [0, aᵢ − borrowIn]`.
- The top column also guarantees no final carry (sum < 1000) or no final borrow (`a ≥ b`), and a non-zero leading digit.

Difficulty narrows these digit ranges (e.g., difficulty 1 bans 0, and limits `b` to one fewer digit). Each choice is `rng.int(lo, hi)` over a range proven non-empty, so generation is O(digits) and always terminates.

## Files
**New** (all under `src/domain/`):
```
types.ts                       Skill, WorldId, Question, QuestionKind, Answer, Response, CheckResult, Hint, MisconceptionKey
speech.ts                      numberToWords(0–1000), equationToSpeech()
curriculum/worlds.ts           5 MVP worlds (id, title, theme, order, reward)
curriculum/skills.ts           23 skill records (data only)
curriculum/skillGraph.ts       validateGraph(), unlockedSkills(mastered), skillsInWorld()
arithmetic/digits.ts           toDigits / fromDigits (ones first)
arithmetic/solveColumns.ts     column steps for + and −
arithmetic/regroupPattern.ts   classify (a, b, op) → pattern
arithmetic/sampleOperands.ts   constructive sampler for a pattern + digit constraints
arithmetic/misconceptions.ts   simulateBugs(), detectMisconception(), MISCONCEPTION_PRIORITY
arithmetic/distractors.ts      pickDistractors(correct, bugs, rng, count)
generators/shared.ts           makeQuestion(), buildPrompt(), columnPayload(), tradeBlocksPayload()
generators/basicFacts.ts       within-20 add/sub
generators/columnArithmetic.ts all add/sub column skills (driven by skill.pattern + digits)
generators/mixed.ts            addsub.*.mixed incl. missing-number form
generators/placeValue.ts       pv.* skills
generators/check.ts            check(question, response) → CheckResult
generators/registry.ts         skillId → generator; generateQuestion(); completeness guard
index.ts                       public exports
```
**Tests** (`tests/unit/domain/`): `speech.test.ts`, `skillGraph.test.ts`, `solveColumns.test.ts` (exhaustive 2-digit), `regroupPattern.test.ts`, `sampleOperands.test.ts`, `misconceptions.test.ts` (catalog table as `it.each`), `distractors.test.ts`, `generators.property.test.ts` (AC5/AC6 sweep), `check.test.ts`, `performance.test.ts`.

**Changed docs:** `specs/02-curriculum-skill-map.md` (replace the misconception catalog with the one in this spec), `specs/01-product-spec.md` §5.3 (fix the across-zero example: 403 − 178 → 235; 335 is `borrowNoDecrement`).

## Key types (sketch)
```ts
type Op = '+' | '-'
type RegroupPattern = 'add.none' | 'add.carryOnes' | 'add.carryTens' | 'add.carryBoth'
  | 'sub.none' | 'sub.borrowTens' | 'sub.borrowHundreds' | 'sub.borrowBoth' | 'sub.acrossZero'

interface ColumnStep { place: 0 | 1 | 2; top: number; topAfterBorrow: number; bottom: number;
  carryIn: 0 | 1; carryOut: 0 | 1; borrowedFromNext: boolean; digit: number }

type Answer = { type: 'number'; value: number } | { type: 'comparison'; value: '<' | '=' | '>' }
  | { type: 'boolean'; value: boolean } | { type: 'choice'; value: number }

type Response = { kind: 'number'; value: number } | { kind: 'columnDigits'; digits: (number | null)[] }
  | { kind: 'comparison'; value: '<' | '=' | '>' } | { kind: 'boolean'; value: boolean }
  | { kind: 'choice'; index: number }
```
`Question.payload` is a discriminated union per kind (`column`: operands, op, digit count; `tradeBlocks`: starting blocks + goal; `mcq`: choices; `compare`: left/right; `trueFalse`: shown value).

## Test plan
| AC | Test |
|---|---|
| AC1–AC2 | `skillGraph.test.ts`: data validation, cycle check, unlock table |
| AC3 | `solveColumns.test.ts`: exhaustive 0–99 × 0–99, plus fast-check for 3-digit |
| AC4 | `regroupPattern.test.ts`: spec table examples plus property: `regroupPattern(sample(pattern)) === pattern` |
| AC5–AC6 | `generators.property.test.ts`: every skill × difficulty × kind × 500 seeds; deep-equal on re-generate |
| AC7 | `performance.test.ts`: 10k questions < 1s (budget loosened on CI if needed and documented) |
| AC8 | `misconceptions.test.ts`: catalog examples (`it.each`), priority, "never fires when equal to correct" |
| AC9 | `distractors.test.ts` + sweep assertions on mcq/trueFalse |
| AC10 | `check.test.ts`: column digit responses with one wrong digit → one stepError |
| AC11 | `speech.test.ts`: table of known values + property: no "undefined"/double spaces for 0–1000 |
| AC12 | lint (existing rules) + `vitest --coverage` threshold on `src/domain/arithmetic/**` |

## Risks
- **Over-constraining difficulty 1** could leave an empty digit range for a pattern (e.g., borrowBoth with no zeros and a one-digit-shorter `b`). Mitigation: the sampler asserts non-empty ranges, and the property sweep covers every (pattern, difficulty) combination.
- **Bug collisions:** two bugs can yield the same number. The priority order is fixed and tested.
- **Scope creep into F06:** kind selection by mastery stays out; generators only honor the requested kind.
