import { buildChoices, pickDistractors } from '../arithmetic/distractors'
import type { Rng } from '../rng'
import {
  equationToSpeech,
  equationToText,
  numberToWords,
  type PlaceWord,
  placeWord,
} from '../speech'
import type {
  ArithmeticMeta,
  Comparison,
  Difficulty,
  Display,
  Equation,
  GenerateOptions,
  Hint,
  Place,
  Question,
  Skill,
  Slot,
} from '../types'
import {
  arithmeticQuestion,
  blocksOf,
  type Generator,
  intExcluding,
  makeQuestion,
  unsupportedKind,
} from './shared'

const PLACE_NAMES = ['ones', 'tens', 'hundreds'] as const
const BASE_TEN: Hint = { type: 'visual', visual: 'baseTen' }

type Units = Extract<Display, { type: 'units' }>

function unitsParts(u: Units, show: (v: Slot) => string): string[] {
  const part = (v: Slot, place: PlaceWord) => `${show(v)} ${placeWord(place, v)}`
  return [
    ...(u.hundreds === undefined ? [] : [part(u.hundreds, 'hundreds')]),
    part(u.tens, 'tens'),
    part(u.ones, 'ones'),
  ]
}

function unitsText(u: Units): string {
  const parts = unitsParts(u, (v) => (v === null ? '?' : String(v))).join(' ')
  return u.total === null ? `${parts} = ?` : `${u.total} = ${parts}`
}

function unitsSpeech(u: Units): string {
  const w = (v: Slot) => (v === null ? 'how many' : numberToWords(v))
  const parts = unitsParts(u, w).join(', ')
  return u.total === null ? `${parts}. What number is that?` : `${w(u.total)} is ${parts}?`
}

/**
 * A numeric-answer place-value question in numeric / mcq / tradeBlocks form.
 * `preferred` are plausible mistakes used first as MCQ distractors.
 */
function numberQuestion(
  skill: Skill,
  opts: GenerateOptions,
  rng: Rng,
  q: {
    display: Display
    text: string
    speech: string
    correct: number
    preferred: readonly number[]
    hints: readonly Hint[]
    blocksOf?: number
    maxChoice?: number
  },
): Question {
  const answer = { type: 'number', value: q.correct } as const
  const prompt = { text: q.text, speech: q.speech }
  switch (opts.kind) {
    case 'numeric':
      return makeQuestion(skill, opts, {
        prompt,
        payload: { kind: 'numeric', display: q.display },
        answer,
        hints: q.hints,
      })
    case 'mcq': {
      const distractors = pickDistractors(q.correct, q.preferred, rng, 3, q.maxChoice)
      return makeQuestion(skill, opts, {
        prompt: { ...prompt, speech: `${q.speech} Pick the answer.` },
        payload: {
          kind: 'mcq',
          display: q.display,
          choices: buildChoices(q.correct, distractors, rng),
        },
        answer,
        hints: q.hints,
      })
    }
    case 'tradeBlocks':
      if (q.blocksOf === undefined) return unsupportedKind(skill, opts.kind)
      return makeQuestion(skill, opts, {
        prompt: { ...prompt, speech: `${q.speech} Trade with the blocks.` },
        payload: {
          kind: 'tradeBlocks',
          display: q.display,
          start: blocksOf(q.blocksOf),
          task: 'trade',
        },
        answer,
        hints: q.hints,
      })
    default:
      return unsupportedKind(skill, opts.kind)
  }
}

/** A 3-digit number's digits; zeros allowed in tens/ones only from difficulty 4. */
function sampleDigits(d: Difficulty, rng: Rng, distinct = false) {
  const lo = d >= 4 ? 0 : 1
  const h = rng.int(1, 9)
  const t = distinct ? intExcluding(rng, lo, 9, [h]) : rng.int(lo, 9)
  const o = distinct ? intExcluding(rng, lo, 9, [h, t]) : rng.int(lo, 9)
  return { h, t, o, n: h * 100 + t * 10 + o }
}

// ------------------------------------------------------------------ tasks

/** 36 = 2 tens ? ones → 16. d1 tens 2–4; d4+ ones may be 0 (40 = 3 tens 10 ones). */
function tradeTens(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  const d = opts.difficulty
  const t = d === 1 ? rng.int(2, 4) : rng.int(2, 9)
  const o = rng.int(d >= 4 ? 0 : 1, 9)
  const n = t * 10 + o
  const display: Units = { type: 'units', tens: t - 1, ones: null, total: n }
  return numberQuestion(skill, opts, rng, {
    display,
    text: unitsText(display),
    speech: unitsSpeech(display),
    correct: o + 10,
    preferred: [o, 10],
    hints: [BASE_TEN, { type: 'text', key: 'pv.tradeTens.oneTenIsTenOnes' }],
    blocksOf: n,
  })
}

/**
 * d1–2: trade a hundred for tens (523 = 4 hundreds ? tens 3 ones → 12)
 * d3:   trade a ten for ones (523 = 5 hundreds 1 tens ? ones → 13)
 * d4–5: across zero (403 = 3 hundreds 9 tens ? ones → 13)
 */
function tradeHundreds(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  const d = opts.difficulty
  const h = rng.int(2, 9)
  let display: Units
  let correct: number
  let preferred: number[]
  let n: number
  if (d <= 2) {
    const t = d === 1 ? rng.int(1, 4) : rng.int(1, 9)
    const o = rng.int(1, 9)
    n = h * 100 + t * 10 + o
    display = { type: 'units', hundreds: h - 1, tens: null, ones: o, total: n }
    correct = t + 10
    preferred = [t, 10]
  } else if (d === 3) {
    const t = rng.int(2, 9)
    const o = rng.int(1, 9)
    n = h * 100 + t * 10 + o
    display = { type: 'units', hundreds: h, tens: t - 1, ones: null, total: n }
    correct = o + 10
    preferred = [o, 10]
  } else {
    const o = rng.int(d === 4 ? 1 : 0, 9)
    n = h * 100 + o
    display = { type: 'units', hundreds: h - 1, tens: 9, ones: null, total: n }
    correct = o + 10
    preferred = [o, 10]
  }
  return numberQuestion(skill, opts, rng, {
    display,
    text: unitsText(display),
    speech: unitsSpeech(display),
    correct,
    preferred,
    hints: [BASE_TEN, { type: 'text', key: 'pv.tradeHundreds.oneHundredIsTenTens' }],
    blocksOf: n,
  })
}

/** d1 digit-in-place (distinct digits), d2 units → number, d3+ either; zeros from d4. */
function hundredsTensOnes(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  const d = opts.difficulty
  const { h, t, o, n } = sampleDigits(d, rng, true)
  const task = d === 1 ? 'digit' : d === 2 ? 'units' : rng.pick(['digit', 'units'] as const)
  const hints: Hint[] = [BASE_TEN, { type: 'text', key: 'pv.hundredsTensOnes.places' }]

  if (task === 'digit') {
    const place = rng.pick([0, 1, 2] as const) as Place
    const digits = [o, t, h]
    const correct = digits[place] as number
    const name = PLACE_NAMES[place]
    return numberQuestion(skill, opts, rng, {
      display: { type: 'digitInPlace', number: n, place },
      text: `Which digit is in the ${name} place of ${n}?`,
      speech: `Which digit is in the ${name} place of ${numberToWords(n)}?`,
      correct,
      preferred: digits.filter((x) => x !== correct),
      hints,
      maxChoice: 9,
    })
  }

  const display: Units = { type: 'units', hundreds: h, tens: t, ones: o, total: null }
  const reversed = o * 100 + t * 10 + h
  const droppedZero = Number([h, t, o].filter((x) => x !== 0).join(''))
  return numberQuestion(skill, opts, rng, {
    display,
    text: unitsText(display),
    speech: unitsSpeech(display),
    correct: n,
    preferred: [droppedZero, reversed],
    hints,
  })
}

/** d1–3: 300 + 40 + 5 = ?; d4–5: 345 = 300 + ? + 5 (zero parts are left out). */
function expandedForm(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  const d = opts.difficulty
  const h = rng.int(1, 9)
  const t = rng.int(d >= 4 ? 0 : 1, 9)
  const o = rng.int(d >= 4 && t === 0 ? 1 : d >= 4 ? 0 : 1, 9)
  const n = h * 100 + t * 10 + o
  const parts = [h * 100, t * 10, o].filter((x) => x !== 0)
  const hints: Hint[] = [BASE_TEN, { type: 'text', key: 'pv.expandedForm.addTheParts' }]

  let equation: Equation
  let correct: number
  let preferred: number[]
  if (d <= 3) {
    equation = { terms: parts, ops: parts.slice(1).map(() => '+' as const), result: null }
    correct = n
    preferred = [Number([h, t, o].filter((x) => x !== 0).join(''))]
  } else {
    const hide = rng.int(0, parts.length - 1)
    correct = parts[hide] as number
    equation = {
      terms: parts.map((p, i) => (i === hide ? null : p)),
      ops: parts.slice(1).map(() => '+' as const),
      result: n,
    }
    const digit = correct >= 100 ? correct / 100 : correct >= 10 ? correct / 10 : correct
    preferred = [digit, correct * 10]
  }
  return numberQuestion(skill, opts, rng, {
    display: { type: 'equation', equation },
    text: equationToText(equation),
    speech: `${equationToSpeech(equation)}?`,
    correct,
    preferred,
    hints,
  })
}

/**
 * d1 hundreds differ; d2 hundreds differ but the smaller number has bigger tens;
 * d3 same hundreds; d4 same hundreds and tens; d5 swapped digits (452 vs 425) or equal.
 */
function compare(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  if (opts.kind !== 'compare') return unsupportedKind(skill, opts.kind)
  const d = opts.difficulty
  const num = (h: number, t: number, o: number) => h * 100 + t * 10 + o
  let x: number
  let y: number
  if (d === 1) {
    const h1 = rng.int(1, 9)
    x = num(h1, rng.int(0, 9), rng.int(0, 9))
    y = num(intExcluding(rng, 1, 9, [h1]), rng.int(0, 9), rng.int(0, 9))
  } else if (d === 2) {
    const h1 = rng.int(1, 8)
    const h2 = rng.int(h1 + 1, 9)
    const t2 = rng.int(0, 8)
    x = num(h1, rng.int(t2 + 1, 9), rng.int(0, 9))
    y = num(h2, t2, rng.int(0, 9))
  } else if (d === 3) {
    const h = rng.int(1, 9)
    const t1 = rng.int(0, 9)
    x = num(h, t1, rng.int(0, 9))
    y = num(h, intExcluding(rng, 0, 9, [t1]), rng.int(0, 9))
  } else if (d === 4) {
    const h = rng.int(1, 9)
    const t = rng.int(0, 9)
    const o1 = rng.int(0, 9)
    x = num(h, t, o1)
    y = num(h, t, intExcluding(rng, 0, 9, [o1]))
  } else {
    const h = rng.int(1, 9)
    const t = rng.int(0, 9)
    const o = intExcluding(rng, 0, 9, [t])
    x = num(h, t, o)
    y = rng.int(1, 5) === 1 ? x : num(h, o, t)
  }
  const [left, right] = rng.bool() ? [x, y] : [y, x]
  const value: Comparison = left < right ? '<' : left > right ? '>' : '='
  return makeQuestion(skill, opts, {
    prompt: {
      text: `${left} ? ${right}`,
      speech: `Is ${numberToWords(left)} greater than, less than, or equal to ${numberToWords(right)}?`,
    },
    payload: { kind: 'compare', left, right },
    answer: { type: 'comparison', value },
    hints: [BASE_TEN, { type: 'text', key: 'pv.compare.startWithHundreds' }],
  })
}

/**
 * d1 +10 (no crossing); d2 ±10 (no crossing); d3 ±100; d4 ±10 crossing a hundred
 * (395 + 10, 402 − 10); d5 any of these. Diagnosed like any addition/subtraction.
 */
function plus10plus100(skill: Skill, opts: GenerateOptions, rng: Rng): Question {
  const mode =
    opts.difficulty === 5 ? rng.pick([2, 3, 4] as const) : (opts.difficulty as 1 | 2 | 3 | 4)
  let m: ArithmeticMeta
  if (mode === 1) {
    m = {
      a: rng.int(1, 9) * 100 + rng.int(0, 8) * 10 + rng.int(0, 9),
      b: 10,
      op: '+',
      unknown: 'result',
    }
  } else if (mode === 2) {
    const up = rng.bool()
    const h = rng.int(1, 9)
    const t = up ? rng.int(0, 8) : rng.int(1, 9)
    m = { a: h * 100 + t * 10 + rng.int(0, 9), b: 10, op: up ? '+' : '-', unknown: 'result' }
  } else if (mode === 3) {
    const up = rng.bool()
    const h = up ? rng.int(1, 8) : rng.int(2, 9)
    m = { a: h * 100 + rng.int(0, 99), b: 100, op: up ? '+' : '-', unknown: 'result' }
  } else {
    const up = rng.bool()
    const h = up ? rng.int(1, 8) : rng.int(2, 9)
    m = { a: h * 100 + (up ? 90 : 0) + rng.int(0, 9), b: 10, op: up ? '+' : '-', unknown: 'result' }
  }
  return arithmeticQuestion(skill, opts, rng, m, [
    BASE_TEN,
    { type: 'text', key: 'pv.plus10plus100.onlyOnePlaceChanges' },
  ])
}

const TASKS = {
  tradeTens,
  tradeHundreds,
  hundredsTensOnes,
  expandedForm,
  compare,
  plus10plus100,
} as const

export const placeValueGenerator: Generator = (skill, opts, rng) => {
  if (skill.spec.type !== 'placeValue') throw new Error(`${skill.id} is not a place-value skill`)
  return TASKS[skill.spec.task](skill, opts, rng)
}
