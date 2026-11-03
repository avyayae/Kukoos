# Plan — Feature 018 Spanish Course & Voice

## Reuse first
- **Courses (F13):** the registry, `profileCourses`, `toggleCourse`, the onboarding course step, **My courses** and the switcher already work for any number of courses. Spanish is one more registry entry.
- **The open-play limit (F13 chess limit):** the same shape for Spanish. `spanishLimitMin` goes on the per-kid settings row and `spanishSeconds` on today's activity row (both optional fields, so **no schema change**). The budget uses the same function as chess (`chessBudget` becomes `openPlayBudget`, kept under its old name too).
- **Time tracking:** `useActivity('spanish')` and one more branch in the `TimeProvider` tick.
- **The rest screen:** the same layout as `ChessRest`, with its own words.

## Speech per language (`src/audio/`)
- **`voices.ts`:** `isSpanish` and `rankSpanishVoices`: es-MX, then es-US, es-419, other Latin American, then es-ES. Natural/neural voices first, local before network, novelty voices last. Deterministic, like `rankVoices`.
- **`prefs.ts`:** `AudioPrefs.spanishVoiceURI` (`null` = best on this device), saved on the `global` settings row like `voiceURI`.
- **`tts.ts`:**
  - `configureSpeech` takes `spanishVoiceURI`.
  - `spanishVoice()` returns the chosen voice, else the top-ranked one, else `null`.
  - `speak(text, { lang: 'es' })` picks the Spanish voice. With no Spanish voice it still sets `utterance.lang = 'es-MX'`, so the browser can do its best.
  - **`speakParts(parts)`**, where each part is a string (English) or `{ es: string }`, cancels anything playing and queues one utterance per part. `speaking` is true from the first start to the last end.
- **`useSpeech.ts`:** `useVoices()` stays English; a new `useSpanishVoices()`.

## Course registry and gate
- `CourseId = 'math' | 'chess' | 'spanish'`. `SPANISH = { id: 'spanish', name: 'Spanish', nameLocal: 'Español', icon: '💬', timed: false }`.
- `availableCourses({ chess, spanish })`. `spanishAvailable()` reads `VITE_SPANISH === '1'` at call time. It's set in `.env.e2e` and a new `.env.development`, so `npm run dev` shows Spanish too.
- **Course cards** show `nameLocal` under the name ("Spanish / Español").

## UI
- **`src/features/spanish/`:**
  - `SpanishHome` (lazy): the header with the course switcher, Kukoos saying **"¡Hola!"** in Spanish and then "Hola Island is getting ready!" in English, through `speakParts`.
  - `SpanishRest`, for when the limit is reached.
- **`MapScreen`:** `courses.current === 'spanish'` → `SpanishRest` if `time.spanish.locked`, else `SpanishHome`.
- **Grown-ups → Sound & voice:** a **Spanish voice** picker (only `es` voices, "Best on this device" first) and **Test Spanish voice**. With no Spanish voice, a help line explains how to add one. Shown only when Spanish is available.
- **Grown-ups → Daily time:** a "Spanish" block, the same as the chess one ("Today: N min of Spanish", Spanish daily limit, off by default). Shown only when Spanish is available.

## Constitution
- The header lists three courses.
- §1.3: Spanish is open play.
- §2.4: a Spanish example (picture + sound → word → phrase).
- §2.5: the Spanish skill map and ACTFL Novice Low.
- §3.4: language content is hand-reviewed data validated by tests.

## Test plan
| AC | Test |
|---|---|
| AC1 | `domain/courses.test.ts` (registry, gate), `courses.test.tsx` (onboarding and My courses with and without the gate) |
| AC2 | `spanishHome.test.tsx` (switch to Spanish, math and chess untouched) |
| AC3 | `audio/voices.test.ts` (Spanish ranking), `audio/tts.test.ts` (lang and voice per utterance) |
| AC4 | `audio/tts.test.ts` (`speakParts` order, voices, cancel) |
| AC5 | `GrownUpsScreen.test.tsx` (Spanish voice picker, sample, no-voice help) |
| AC6 | `timeProvider.test.tsx`, `data/courses.test.ts` (spanishSeconds, limit), `spanishHome.test.tsx` (rest) |
| AC7 | `perf.spec.ts` (no Spanish chunk in the first load) |
| AC8 | `spanish.spec.ts` (e2e: Spanish-only onboarding, "¡Hola!" in a Spanish voice, switching) |

## Risks
- **Device voices:** many Windows and Android devices have no Spanish voice until one is installed. The help line and the per-language picker make this visible to the grown-up. The F19 lesson screen will still show every word (and work silently) without one.
- **Tests that list courses:** e2e builds now offer three courses, so the onboarding and switcher e2e helpers need to pick by name, not by position.

## Deviations (recorded during implementation)
- **"Español" on the course card is a visual subtitle** (`aria-hidden`). The card's accessible name stays "Spanish", so the English voice and name-based helpers say one clear name.
- **The course switcher with three courses** stacks the icon above the name, so all three fit on one row on a 360px phone.
- **Only the Spanish home is lazy.** `SpanishRest` and the small lazy loader stay in the main bundle, the same as `ChessRest`. The perf test checks that the home chunk isn't in the first load.
- **Goodnight (the math limit) still offers only chess.** A Spanish kid at the math limit switches with the course switcher. Offering Spanish there comes with the F20 launch.
- **No schema change:** `spanishSeconds`, `spanishLimitMin` and `spanishVoiceURI` are optional fields on existing rows.
