# Plan — Feature 019 Spanish Words & Lessons

## Reuse first
- **The chess lesson pattern (F16):** this feature copies its shapes with Spanish types.
  - A pure reducer in the domain with the phases `answering → correct | notYet → solution → complete`.
  - A route with the "Already know this?" offer, plus a screen.
  - `repos.lessons.save(state)` saves the lesson and applies XP, crystals and mastery.
  - `LessonComplete` shows the celebration.
  - `useActivity('spanish')` keeps the time out of the math goal and streak.
- **Mastery, crowns, review:** the shared model with `skillId = es.*`. No data or schema change.
- **The parent report** stays math-only: it already filters by the math skill IDs.
- **Speech:** `speak(text, { lang: 'es' })` and `speakParts` from F18.

## Domain: `src/domain/spanish/` (pure, never in the `@/domain` barrel)
- **`words.ts`:**
  - `SpanishWord { id, es, article?, en, picture, say? }`. The `article` is `'el' | 'la' | 'los' | 'las'`.
  - `picture` is one of `{ emoji }`, `{ swatch: '#hex' }` or `{ number: n }`. A number shows as a numeral, or as dots in `count`.
  - `SPANISH_WORDS: Record<skillId, SpanishWord[]>`. `shown(word)` gives "el perro", and `spoken(word)` gives `say ?? shown`.
- **`curriculum.ts`:**
  - `SPANISH_AREAS` and `SPANISH_SKILLS` (`id`, `title`, `area`, `kinds`, `intro`).
  - `spanishUnlocked`, `nextSpanishSkill`, `spanishDue`, `spanishNodes` and `isSpanishSkill`, the same as chess.
- **`questions.ts`:** `generateSpanishQuestion(skillId, { kind, difficulty, seed })` returns a `SpanishQuestion`.
  - Fields: `{ id, skillId, kind, difficulty, answer: SpanishWord, choices: SpanishWord[], prompt: { text, speech } }`.
  - For `match`, `choices` holds the words to join.
  - Distractors are drawn by seed from the same skill, then from earlier skills. Difficulty 3 always includes at least one earlier word. A distractor never shares the answer's picture or English meaning.
- **`lesson.ts`:** `startSpanishLesson({ skillId, seed, at, progress, mode, skipCheck, canHear })` and `spanishLessonReducer`.
  - Events: `choice(wordId)`, `pair(wordId, pictureId)`, `said`, `retry`, `continue`.
  - The plan has 8 scored questions, with kinds cycled from the skill. A `say` step goes after the 4th (not in a skip-check or a review). Up to 2 requeues.
  - When `canHear` is false, `listen`, `count` and `say` are replaced with `see`.
  - Adaptive difficulty works like chess. A wrong pick records `es.mixup:<answer>~<picked>`.
  - `match`: a right pair locks it. A wrong pair is a miss, and the locked pairs stay after the retry.
- **Types:** `AnswerKind` gains `` `es.${SpanishKind}` ``, and `MistakeKey` gains `` `es.${string}` ``.

## UI: `src/features/spanish/`
- **`SpanishHome`** (still lazy): the F18 hello, plus a temporary **skill list** grouped by area.
  - Each row is a node button: locked 🔒, current (pulse), or crowned 👑.
  - **Play next** and **Review** (when anything is due).
- **`SpanishLessonGate`** (lazy) → `SpanishLessonRoute`, with `/spanish/lesson/:skillId` and `/spanish/lesson/review`. It has the offer, check, passed and failed cards, like chess.
- **`SpanishLessonScreen`:** the top bar (✕, progress, 🔊/🔇), the Kukoos bubble with the English prompt, a big **🔊 word** button (`listen`, `count`, `say`), and the choices:
  - `listen` and `count`: picture cards (`WordPicture`: emoji, swatch, numeral or dots).
  - `see`: word tiles. The first tap speaks and selects the tile, and a second tap answers.
  - `match`: two columns. Tap a word (it speaks), then a picture.
  - `say`: Kukoos says the word, with **"I said it!"** and **"Hear it again"**.
  - The feedback banner works like chess. A correct answer speaks `¡Muy bien! el perro.` in Spanish. A second miss highlights the answer and speaks it.
- **Speech rules (AC5):**
  - The English prompt plays only when read-aloud is on.
  - The Spanish word for `listen` and `count` always plays when the question opens, and on 🔊.
  - Tiles and pairs speak when tapped.
- **`isSpeechSupported() === false`:** `canHear: false`, and the home shows "Ask a grown-up to turn on a Spanish voice".

## Word review
- **`specs/features/019-spanish-words/words.review.md`:** a table per skill (Spanish, English, picture).
- A unit test rebuilds the table from the data and compares it with the file. `UPDATE_REVIEW=1` rewrites the file.

## Test plan
| AC | Test |
|---|---|
| AC1 | `domain/spanish/curriculum.test.ts` (doc ↔ code IDs, areas, order, kinds) |
| AC2 | `domain/spanish/words.test.ts` (IDs, articles, pictures, sizes, review table) |
| AC3 | `domain/spanish/questions.property.test.ts` (skill × kind × difficulty × 300 seeds) |
| AC4, AC8, AC9 | `domain/spanish/lesson.test.ts` (reducer), `features/spanishLesson.test.tsx` (screen) |
| AC5 | `features/spanishLesson.test.tsx` (speak calls with `lang: 'es'`, read-aloud off) |
| AC6, AC7 | `domain/spanish/curriculum.test.ts`, `features/spanishLesson.test.tsx` (route, skip-check) |
| AC10 | `perf.spec.ts` (Spanish lesson chunk not in the first load) |
| AC11 | `e2e/spanish.spec.ts` |

## Risks
- **Emoji differences across devices:** keep to common emoji (Unicode ≤ 13).
- **Spoken numbers for 16–19:** use the single-word forms ("dieciséis").
- **Bundle size:** the words are about 10 KB and lazy, so they don't affect the first load.

## Deviations (recorded during implementation)
- **Word list changes from the skill map's examples** (the map lists examples; `words.review.md` is the list to approve):
  - `es.body`: "la cabeza" is left out (no clear emoji), and "la oreja" 👂 is added.
  - `es.home`: "la mesa" is left out (no clear emoji), and "la ventana" 🪟 is added.
  - `es.feelings`: "asustado / asustada" 😨 is added, so the skill has 5 words.
  - `es.market` pictures: big 🌳, small 🌱, a lot 🍎🍎🍎🍎, a little 🍎.
- **Number word IDs are plain ASCII** ("dieciseis"). The Spanish shown and spoken keeps its accent.
- **Distractors never share a meaning.** "orange (fruit)" and "orange" count as the same meaning, so 🍊 and the orange swatch never appear together.
- **A skill is reachable by URL even when locked,** as in chess. The path and Play next only open unlocked skills.
- **The offer and result cards reuse the chess card layout** (`chess-card` classes plus `spanish-card`).
- **The skill path reuses the math and chess map nodes** (`journey`, `band`, `map-node`), with island bands `band--es-*`. F20 turns it into Hola Island.
