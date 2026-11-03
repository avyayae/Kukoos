import { createRng, type Rng } from '../rng'
import type { SkillId, SpanishKind } from '../types'
import { skillsBefore } from './curriculum'
import { pictureKey, type SpanishWord, shown, spoken, wordsOf } from './words'

export type SpanishDifficulty = 1 | 2 | 3

export interface SpanishQuestion {
  /** `${skillId}:${kind}:${difficulty}:${seed}`: the same seed gives the same question. */
  id: string
  skillId: SkillId
  kind: SpanishKind
  difficulty: SpanishDifficulty
  /** The word asked about (for `match`: one of the words to join). */
  answer: SpanishWord
  /** The cards or tiles shown: the answer exactly once, plus distractors (`say`: none). */
  choices: readonly SpanishWord[]
  /** English instructions, shown and read aloud. */
  prompt: { text: string; speech: string }
  /** The Spanish to play for this question (`listen`, `count`, `say`). */
  word: string
}

export interface SpanishQuestionOptions {
  kind: SpanishKind
  difficulty: SpanishDifficulty
  seed: number
}

const PROMPTS: Record<SpanishKind, string> = {
  listen: 'Tap the one you hear!',
  count: 'Find the dots you hear!',
  see: 'Which word is this?',
  match: 'Match the words to the pictures!',
  say: 'Say it with Kukoos!',
}

/** How many cards a question shows (skill map). */
export function choiceCount(kind: SpanishKind, difficulty: SpanishDifficulty): number {
  if (kind === 'say') return 0
  if (kind === 'listen' || kind === 'match') return difficulty === 3 ? 4 : 3
  return 3
}

const isNumber = (w: SpanishWord) => 'number' in w.picture
/** "orange (fruit)" and "orange" mean the same to a kid: never both on screen. */
const meaning = (w: SpanishWord) => w.en.replace(/\s*\(.*\)$/, '').toLowerCase()

/** Two words that must never be on screen together (same picture, meaning or text). */
function clash(a: SpanishWord, b: SpanishWord): boolean {
  return (
    a.id === b.id ||
    pictureKey(a.picture) === pictureKey(b.picture) ||
    meaning(a) === meaning(b) ||
    shown(a) === shown(b)
  )
}

/** Adds candidates that clash with nothing picked so far, up to `count`. */
function fill(picked: SpanishWord[], candidates: readonly SpanishWord[], count: number) {
  for (const w of candidates) {
    if (picked.length >= count) return
    if (!picked.some((p) => clash(p, w))) picked.push(w)
  }
}

/**
 * Distractors come from the same skill first, then from earlier skills (difficulty 3 always
 * mixes in an earlier word when there is one). Numbers only meet numbers.
 */
function pickChoices(
  rng: Rng,
  skillId: SkillId,
  answer: SpanishWord,
  count: number,
  difficulty: SpanishDifficulty,
): SpanishWord[] {
  const same = rng.shuffle(wordsOf(skillId))
  const earlier = rng.shuffle(
    skillsBefore(skillId)
      .flatMap((s) => wordsOf(s.id))
      .filter((w) => isNumber(w) === isNumber(answer)),
  )
  const picked = [answer]
  if (difficulty === 3) fill(picked, earlier, 2)
  fill(picked, same, count)
  fill(picked, earlier, count)
  return rng.shuffle(picked)
}

/** A Spanish question (spec 019 AC3). Pure and seeded: the right answer is picked by code. */
export function generateSpanishQuestion(
  skillId: SkillId,
  { kind, difficulty, seed }: SpanishQuestionOptions,
): SpanishQuestion {
  const words = wordsOf(skillId)
  if (words.length === 0) throw new Error(`No words for ${skillId}`)
  const rng = createRng(seed)
  const answer = rng.pick(words)
  const choices =
    kind === 'say'
      ? []
      : pickChoices(rng, skillId, answer, choiceCount(kind, difficulty), difficulty)
  const text = PROMPTS[kind]
  return {
    id: `${skillId}:${kind}:${difficulty}:${seed}`,
    skillId,
    kind,
    difficulty,
    answer,
    choices,
    prompt: { text, speech: text },
    word: spoken(answer),
  }
}
