// Core domain types (spec 003). Pure data — no behavior, no UI.

export type Op = '+' | '-'
export type Comparison = '<' | '=' | '>'

export type Difficulty = 1 | 2 | 3 | 4 | 5
export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5]

/** 0 = ones, 1 = tens, 2 = hundreds. */
export type Place = 0 | 1 | 2

// ---------------------------------------------------------------- curriculum

export type WorldId = 'jungle' | 'savanna' | 'ocean' | 'moon' | 'mars'

export interface World {
  id: WorldId
  order: number
  title: string
  theme: 'animals' | 'space'
  /** Collectible earned when the world's boss is beaten. */
  reward: string
}

export type SkillId = string

export type QuestionKind = 'numeric' | 'column' | 'tradeBlocks' | 'mcq' | 'compare' | 'trueFalse'

export type VisualKind = 'tenFrame' | 'baseTen' | 'none'

/** Which columns regroup (see spec 003, "Regrouping patterns"). */
export type RegroupPattern =
  | 'add.none'
  | 'add.carryOnes'
  | 'add.carryTens'
  | 'add.carryBoth'
  | 'sub.none'
  | 'sub.borrowTens'
  | 'sub.borrowHundreds'
  | 'sub.borrowBoth'
  | 'sub.acrossZero'

export type PlaceValueTask =
  'tradeTens' | 'tradeHundreds' | 'hundredsTensOnes' | 'expandedForm' | 'compare' | 'plus10plus100'

/** How a skill's questions are generated. */
export type SkillSpec =
  | { type: 'basicFact'; op: Op }
  | { type: 'column'; op: Op; digits: 2 | 3; pattern: RegroupPattern }
  | { type: 'mixed'; digits: 2 | 3; patterns: readonly RegroupPattern[] }
  | { type: 'placeValue'; task: PlaceValueTask }

export interface Skill {
  id: SkillId
  worldId: WorldId
  /** Position on the world's path (1 = first node). */
  order: number
  title: string
  ccss: readonly string[]
  prereqs: readonly SkillId[]
  kinds: readonly QuestionKind[]
  visual: VisualKind
  /** Part of the first player's regrouping focus area. */
  focus: boolean
  spec: SkillSpec
}

// ---------------------------------------------------------------- arithmetic

/** One column of a solved column-arithmetic problem. */
export interface ColumnStep {
  place: number
  /** Original digit of the top operand. */
  top: number
  bottom: number
  /** Value actually used in this column after lending/receiving (subtraction). */
  working: number
  /** Subtraction: this column gave 1 to the column on its right. */
  lent: boolean
  /** Subtraction: this column received 10 from the column on its left. */
  received: boolean
  /** Addition carry into / out of this column. */
  carryIn: 0 | 1
  carryOut: 0 | 1
  digit: number
}

export type MisconceptionKey =
  | 'sub.smallerFromLarger'
  | 'sub.borrowNoDecrement'
  | 'sub.acrossZeroSkip'
  | 'add.forgotCarry'
  | 'add.wroteWholeSum'
  | 'wrongOperation'
  | 'offByOne'
  | 'offByTen'

// ---------------------------------------------------------------- questions

/** A number shown to the kid, or the box they must fill (null). */
export type Slot = number | null

export interface Equation {
  terms: readonly Slot[]
  ops: readonly Op[]
  result: Slot
}

export interface Blocks {
  hundreds: number
  tens: number
  ones: number
}

/** What the question area shows (renderers in F05 draw these). */
export type Display =
  | { type: 'equation'; equation: Equation }
  | { type: 'units'; hundreds?: Slot; tens: Slot; ones: Slot; total: Slot }
  | { type: 'digitInPlace'; number: number; place: Place }

export type QuestionPayload =
  | { kind: 'numeric'; display: Display }
  | { kind: 'mcq'; display: Display; choices: readonly number[] }
  | { kind: 'trueFalse'; display: Display }
  | { kind: 'column'; a: number; b: number; op: Op; columns: number }
  | {
      kind: 'tradeBlocks'
      display: Display
      start: Blocks
      task: 'add' | 'subtract' | 'trade'
    }
  | { kind: 'compare'; left: number; right: number }

export type Answer =
  | { type: 'number'; value: number }
  | { type: 'comparison'; value: Comparison }
  | { type: 'boolean'; value: boolean }

export type Hint =
  | { type: 'visual'; visual: VisualKind }
  | { type: 'workedExample'; steps: readonly ColumnStep[] }
  | { type: 'text'; key: string }

/** The underlying arithmetic, kept so check() can diagnose misconceptions. */
export interface ArithmeticMeta {
  a: number
  b: number
  op: Op
  /** Which part of `a op b = c` the kid must find. */
  unknown: 'result' | 'a' | 'b'
}

export interface Question {
  /** `${skillId}:${difficulty}:${kind}:${seed}` — reproducible. */
  id: string
  skillId: SkillId
  difficulty: Difficulty
  kind: QuestionKind
  seed: number
  prompt: { text: string; speech: string }
  payload: QuestionPayload
  answer: Answer
  hints: readonly Hint[]
  arithmetic?: ArithmeticMeta
}

export interface GenerateOptions {
  difficulty: Difficulty
  kind: QuestionKind
  seed: number
}

// ---------------------------------------------------------------- checking

export type Response =
  | { kind: 'number'; value: number }
  /** Column answer cells, ones first; null = left empty. */
  | { kind: 'columnDigits'; digits: readonly (number | null)[] }
  | { kind: 'choice'; index: number }
  | { kind: 'comparison'; value: Comparison }
  | { kind: 'boolean'; value: boolean }

export interface StepError {
  column: number
  expected: number
  got: number | null
}

export interface CheckResult {
  correct: boolean
  misconception?: MisconceptionKey
  stepErrors?: readonly StepError[]
}
