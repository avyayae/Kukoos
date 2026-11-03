# Feature 019 — Spanish Words & Lessons

**Status:** Implemented (2026-11-03)  ·  **Constitution check:**
- §2.1: mastery unlocks the next skill.
- §2.2: spaced review.
- §2.3: about 80% success, with adaptive difficulty.
- §2.4: picture + sound → picture + sound + written word.
- §2.5: every skill is in `specs/06-spanish-skill-map.md` and maps to an ACTFL Novice Low can-do statement.
- §3.3 and §3.4:
  - questions come from pure, seeded generators;
  - the word list is hand-reviewed data checked by tests;
  - code picks the right answer.
- §1.2: no shame (gentle hints, retries).
- §1.3: Spanish is open play.
- §1.4: every Spanish word is heard.
- §3.7: Spanish code loads on demand.

## Why
F18 built the Spanish course frame and its voice. A kid who picks Spanish still sees "Hola Island is getting ready!". F19 delivers the learning itself:
- the **18 skills of first words**;
- the **question kinds** (listen, see, match, count, say);
- **lessons** with the same mastery, review, rewards and gentle feedback as math and chess.

F20 then adds the Hola Island map and stickers, and launches the course. Until then Spanish stays behind `VITE_SPANISH`.

## User stories
- As a kid who can't read Spanish, I want to **hear a word and tap its picture**, so I learn what it means.
- As a kid, I want to **say the word out loud** after Kukoos, without being judged.
- As a kid who knows some words already, I want to **show Kukoos** and skip ahead.
- As a grown-up, I want every Spanish word to be **correct and checked by a person**.

## Scope
1. **Word list:** `src/domain/spanish/words.ts`. Hand-written data for the 18 skills in the skill map.
   - Each word has an `id`, its Spanish (`es`), an `article` for nouns, its English meaning (`en`), and a `picture`.
   - A picture is an emoji, a colour swatch, or a dot count.
   - A word may have a **spoken form** when it differs from the shown one. For example, "cansado / cansada" is shown as both and spoken as "cansado, cansada".
   - Words without a clear emoji are left out.
   - The list is drafted with AI help and **reviewed word by word by a grown-up** in the PR, as a table in `words.review.md` (Spanish, English, picture).
2. **Curriculum:** `src/domain/spanish/curriculum.ts`.
   - It holds the 3 areas and 18 skills, in order, with their prerequisites and the question kinds each skill uses.
   - A test checks that the doc and the code agree on IDs.
3. **Question generators:** `src/domain/spanish/questions.ts`. Pure and seeded, at difficulty 1–3.
   - `listen`: the kid hears the word and taps its picture.
     - Difficulty 1 and 2 show 3 pictures; difficulty 3 shows 4.
     - The written word is **not** shown, because this is a listening question.
   - `see`: the kid sees a picture and taps one of 3 Spanish word tiles.
     - Each tile speaks itself when tapped, and the kid confirms with a second tap (tap once to hear, tap again to choose).
     - Difficulty 1 shows the picture's own word in the prompt bubble as a model.
   - `match`: the kid joins 3 words (4 at difficulty 3) to their pictures. Tapping a word speaks it.
   - `count`: the kid hears a number and taps the group with that many dots. This kind is for the numbers skills only.
   - `say`: Kukoos says the word, then the kid says it and taps **"I said it!"**.
     - There's no microphone and no scoring.
     - It appears at most once per lesson, as an extra step that isn't one of the 8 scored questions.
   - **Distractors:**
     - They come from the same skill first, then from earlier skills (difficulty 3 always mixes in earlier words).
     - They never share the answer's picture or meaning.
     - The right answer appears exactly once.
4. **Spanish lessons:** **8 scored questions**, the same as math and chess, plus an optional `say` step.
   - A correct answer gets the success banner and sound, and the word is said again in Spanish ("¡Sí! El perro.").
   - A wrong answer:
     - First miss: a gentle hint, with Kukoos repeating the word, then a retry.
     - Second miss: the right picture is highlighted and spoken, and the question comes back later, as in math.
   - The progress bar, Kukoos moods, adaptive difficulty and the end-of-lesson celebration (XP, crystals) are shared.
   - Lessons and attempts are saved with `skillId` = `es.*`.
5. **Mastery and review:**
   - Spanish skills use the shared mastery, crowns and spaced-review model.
   - Review mixes due words from crowned skills.
   - Math and chess progress are untouched.
6. **Skip-ahead check:** "Already know these words? Show Kukoos!" offers 3 `listen` questions at difficulty 3. All 3 right on the first try crowns the skill (`preMastered`) and opens the next one. Either way it ends kindly, and it can be skipped.
7. **Mix-ups saved:**
   - A wrong pick is saved on the attempt as `es.mixup:<answerId>~<pickedId>`, ready for the F21 dashboard.
   - Wrong picks by a kid who can't hear the word aren't counted. When speech isn't available, `listen` falls back to `see` (see 8).
8. **No speech available:** if the device can't speak at all, `listen`, `count` and `say` are swapped for `see` and `match`, with the written word always shown.
   - The Spanish home then shows a short note: "Ask a grown-up to turn on a Spanish voice".
   - If speech works but there is no Spanish voice, words are still spoken with `lang = es-MX` (F18). The Grown-ups help line already covers this.
9. **Temporary Spanish home:** until the F20 island map, the placeholder home lists the 18 skills by area with their state (locked, current, crowned), and has **Play next** and **Review** buttons. It's behind the gate, like the F16 "Try the board" button was.

## Acceptance criteria
- **AC1 (curriculum):** the 18 skills, 3 areas and order match `06-spanish-skill-map.md`. Every skill lists its kinds, and `count` is used only by the numbers skills. A test checks that the doc and the code agree.
- **AC2 (word data):**
  - IDs are unique, and every word belongs to a skill.
  - Each skill has ≥ 4 words.
  - Every noun has an article that agrees with it (`el`/`la`/`los`/`las`, singular or plural).
  - Pictures are non-empty and unique within a skill.
  - The review table matches the data.
- **AC3 (generators):** for every skill × kind × difficulty × 300 seeds:
  - the right answer is among the choices exactly once;
  - the choices have the expected count, have distinct pictures, and are all real words;
  - the same seed gives the same question.
- **AC4 (lesson):** a Spanish lesson plays 8 scored questions.
  - A correct answer gives the banner, the `correct` sound and the Spanish word spoken.
  - A first miss gives a hint and a retry.
  - A second miss shows the answer, and the question is retried later.
  - `say` is never scored.
  - The lesson ends with the shared celebration and saves the lesson and attempts.
- **AC5 (speech):** every Spanish word in a question is spoken with `lang: 'es'`, and every instruction in English. 🔊 replays the word. Turning read-aloud off silences instructions, but `listen` still plays its word, because the word *is* the question.
- **AC6 (mastery and review):** crowns and review work for `es.*` skills, and the next skill unlocks only after mastery. Math and chess progress stay as they were.
- **AC7 (skip-ahead):** 3/3 crowns the skill and unlocks the next. 2/3 or less starts the lesson with no penalty. "Skip" goes straight to the lesson.
- **AC8 (mix-ups):** picking 🐱 for "el perro" saves `es.mixup:perro~gato` on that attempt.
- **AC9 (no speech):** with speech unsupported, a lesson has no `listen`, `count` or `say` questions, and shows the written words.
- **AC10 (first load):** the first load stays under 2 MB, and Spanish code and words load only on the Spanish home and lessons (perf test).
- **AC11 (E2E):** a fresh Spanish-only kid:
  - plays the `es.hello` lesson to the celebration;
  - passes the skip-ahead check on `es.manners` and sees it crowned, with `es.feelings` unlocked;
  - makes a deliberate wrong pick, which is recorded.

## UX notes
- **Question screen:** an English prompt of ≤ 6 words with 🔊 ("Tap the one you hear!"), a big 🔊 for the Spanish word, then the choices as large picture cards (≥ 96 px on a 360 px phone).
- **Nouns are always heard and shown with their article** ("el perro"). Gender is never tested.
- **Colours** are drawn as round swatches and **numbers** as dot groups in tens frames, both by code.
- **"I said it!"** is a big friendly button. Kukoos claps no matter what, and there's a "Hear it again" 🔊.
- **No timers** (§1.3), and no "wrong" sounds harsher than math's `notYet`.

## Out of scope
- The Hola Island map, area stickers, and the launch with the gate removed (F20).
- Tiny phrases, reading, spelling, speech checking and recorded audio (Phase 2).
- Chess badges and the dashboard (F21). Mix-ups are only saved here.

## Decisions on the open questions (2026-11-03, approved as recommended)
1. **Who reviews the words?** Recommendation: you check `words.review.md` in the PR (about 95 words, with emoji and English). Kukoos ships only words you approve.
2. **Gendered feelings** (cansado/cansada, enojado/enojada). Recommendation: show both forms and speak both, with no choice between them in v1.
3. **"café" (brown)** may confuse a beginner with coffee. Recommendation: keep "café", the common Latin American word, with a brown swatch. "marrón" is more Spain.
4. **The `say` step.** Recommendation: once per lesson, after the 4th question, on the word the kid just got right.
