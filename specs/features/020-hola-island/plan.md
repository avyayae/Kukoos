# Plan — Feature 020 Hola Island & Spanish Launch

## Reuse first
- **Map:** the F19 `SpanishPath` and the chess `CastleMap` use the same `journey`, `band` and `map-node` look and the "Start here!" bubble. Hola Island is that path with island scenery and area signs.
- **Stickers:** the chess area stickers already use the `crownAll` badge rule. Spanish adds three badges from `SPANISH_AREAS`. The badges are awarded on lesson save and celebrated by the shared orchestrator. The Trophy Room filters `es.*` badges the same way as `chess.*`.
- **Fiesta:** the F19 lesson reducer and screen, in a new `fiesta` mode. The lesson row is saved with `skillId = 'es.fiesta'`, so `useBestScores()` (completed lessons by skill) tells whether the fiesta has been finished once. There is no new table and no schema change.
- **Goodnight:** `onChess` becomes a list of open-play offers.

## Domain
- `SpanishArea.esName`: "El puerto", "El mercado", "La selva".
- `FIESTA = 'es.fiesta'` and `fiestaOpen(progress)`, which is true when every Jungle Trail skill is crowned.
- **`startSpanishLesson({ fiesta: true })`:**
  - 8 questions on 8 different skills, picked by seed from all 18. Each uses one of its kinds, at fixed difficulty alternating 2 and 3, with no `say` step.
  - `state.skillId` is `es.fiesta` and the mode is `review`, so it counts as practice: answers update each word's own skill, and the lesson earns XP and crystals.
- **`badges.ts`:** `SPANISH_AREAS` stickers (`es.area.*`, rule `crownAll`) and `isSpanishBadge`.

## UI
- **`HolaIsland.tsx`** (replaces `SpanishPath.tsx`): the bands are `band--es-harbor`, `band--es-market` and `band--es-jungle`.
  - **Scenery:** `aria-hidden` spans drawn with CSS shapes: Harbor waves and a boat ⛵, Market stall awnings, Jungle leaves.
  - **Area title** is a button: "Harbor · El puerto". Tapping it calls `speakParts([{ es: 'El puerto' }, 'the Harbor'])`.
  - **The ¡Fiesta! stop** 🪅 is last. It is locked until `fiestaOpen`, and crowned once a fiesta lesson has been completed.
- **`/spanish/lesson/es.fiesta`:** `SpanishLessonRoute` handles it with no offer card. When the lesson completes and there's no earlier fiesta lesson, a **FiestaMoment** card follows the celebration: "¡Fiesta!" spoken in Spanish, the island animals, and confetti through the existing reward-moment styles.
- **Voice note:** `useSpanishVoices().length === 0 && useVoices().length > 0`. The second check waits until the browser has loaded its voices, so the note doesn't flash while voices load.
- **Goodnight:** `offers: { course, onOpen }[]`. One button per open-play course ("♞ Play chess", "💬 Play Spanish"), and the body says what's still open.

## Launch
- Delete `spanishAvailable()`, `VITE_SPANISH` (`.env.development`, `.env.e2e`, `vite-env.d.ts`) and every gate.
- Unit tests that switched the gate off become production-behaviour tests.

## Test plan
| AC | Test |
|---|---|
| AC1, AC2 | `features/holaIsland.test.tsx` (areas, stops, states, Play next, locked, signs speak) |
| AC3 | `domain/gamification` badge test (crownAll Harbor), `holaIsland.test.tsx` (Trophy Room filter) |
| AC4 | `domain/spanish/lesson.test.ts` (fiesta plan), `holaIsland.test.tsx` (lock, moment once) |
| AC5 | `spanishCourse.test.tsx` (no flag), e2e onboarding |
| AC6 | `courses.test.tsx` (Goodnight offers) |
| AC7 | `holaIsland.test.tsx` (voice note) |
| AC8 | `perf.spec.ts` |
| AC9 | `e2e/spanish.spec.ts` |

## Risks
- **Skip-ahead crowns earn no stickers.** That's the existing rule ("no badge without practice", §1.1), the same as chess. A kid who skips a whole area gets its sticker once a practised lesson completes the set. The AC9 e2e therefore seeds 5 practised Harbor crowns and plays the 6th skill for real, instead of using skip-ahead checks.
- **First load:** `badges.ts` now imports the Spanish curriculum (skill ids and areas, about 3 KB, no words). The perf test keeps the words and lessons out of the first load.
