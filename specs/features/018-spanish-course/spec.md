# Feature 018 — Spanish Course & Voice

**Status:** Implemented (2026-11-03)  ·  **Constitution check:** this feature **amends** the constitution (see below). Also touches:
- §1.3: Spanish is open play, like chess;
- §1.4: Spanish words are always heard, never only read;
- §1.5: no accounts and no cloud voice, and speech stays on the device;
- §2.5: a new curriculum standard (ACTFL Novice Low);
- §3.4: word lists are reviewed data;
- §3.7: Spanish code loads on demand.

## Why
The family wants their kid to **start learning Spanish** in Kukoos (decisions 2026-11-03, `specs/04-roadmap.md` → v3). The course frame from F13 already supports more than one course. Before Spanish words can be taught (F19), the app needs:
- a **third course** in the registry;
- a **Spanish voice**: today every word is spoken with an English (`en-US`) voice, and Spanish read by an English voice would teach the wrong sounds;
- the **constitution** updated for a language course.

Like chess in F13, the Spanish home stays **hidden in production** until F20 launches it.

## Decisions (2026-11-03)
- **Latin American Spanish.** Voices are ranked es-MX, es-US, es-419, then any other `es`.
- **Total beginner, first words** (`specs/06-spanish-skill-map.md`).
- **The device's own voice first**, with no cloud voice and no recordings in v1.
- **Open play like chess:** no goal and no streak; an optional limit, off by default.
- **Speaking practice with no microphone** ("I said it!", F19).
- **Spanish comes before** the chess badges and dashboard (now F21).

## User stories
- As a kid, I want to pick 🇪🇸 Spanish when I choose what to learn, and switch to it with one tap.
- As a kid who can't read Spanish, I want to **hear** every Spanish word, spoken like a real Spanish speaker.
- As a grown-up, I want to see whether this device has a good Spanish voice, choose it, and hear a sample.
- As a grown-up, I want an optional Spanish time limit, off unless I turn it on.

## Scope
1. **Constitution amendment:**
   - Courses become **Math, Chess and Spanish**.
   - §1.3: Spanish is open play like chess.
   - §2.5: Spanish skills map to `specs/06-spanish-skill-map.md` and ACTFL Novice Low can-do statements.
   - §3.4: language content (words, meanings, pictures) is **hand-reviewed data validated by tests**. AI may help draft it, but a person approves every word.
2. **Course registry:**
   - `spanish` (name "Spanish", icon 🇪🇸 or 💬, `timed: false`). It's available only with `VITE_SPANISH=1` (dev and e2e) until F20.
   - Onboarding, **My courses** and the course switcher offer it automatically when it's available.
3. **Spanish home (placeholder):** "Hola Island is getting ready!", with Kukoos saying "¡Hola!" in Spanish. Loaded lazily, like the chess home was before F16.
4. **Speech per language** (`src/audio/tts.ts`):
   - `speak(text, { lang: 'es' })` uses the Spanish voice, and English stays the default.
   - A mixed line can be queued as parts, for example ["Tap the one you hear:", { es: "el perro" }].
   - `rankVoices` is extended with a Spanish ranking (Latin American first, local voices before network ones, known good voices first).
5. **Grown-ups → Sound & voice:** a **Spanish voice** picker next to the English one, with a sample ("Hola, soy Kukoos. ¡Vamos a aprender español!"). When the device has **no Spanish voice**, a short help line explains how to add one (Android: Google speech languages; iPad: Settings → Accessibility → Spoken Content; Windows: Language settings).
6. **Optional Spanish daily limit** in Grown-ups, **off by default**. It's counted in a new `spanishSeconds` on today's activity row, just like the chess limit.

## Acceptance criteria
- **AC1 (registry):** with `VITE_SPANISH=1`, onboarding and My courses offer Math, Chess and Spanish. Without it, Spanish is never shown. A Spanish-only kid never sees math or chess.
- **AC2 (switching):** a kid with Spanish switches to it in one tap and sees the Spanish home. Their math and chess progress, the math goal and the math streak are unchanged.
- **AC3 (Spanish voice):** given voices [en-US, es-ES, es-MX], the Spanish voice is es-MX. With only es-ES, it's es-ES. With no `es` voice, `spanishVoice()` is null. `speak(…, { lang: 'es' })` sets `utterance.lang` to the voice's language.
- **AC4 (mixed lines):** a line with an English part and a Spanish part is spoken as two utterances, in order, each in its own voice. Turning read-aloud off cancels both.
- **AC5 (grown-ups):** the Spanish voice picker lists only `es` voices, saves the choice per device, and plays the sample. With no Spanish voice, the help line shows instead.
- **AC6 (limit):** the Spanish limit is off by default. When set, Spanish time counts toward it (not toward the math goal or limit, nor the chess limit). When it's reached, the Spanish home rests until tomorrow.
- **AC7 (first load):** the first load stays under 2 MB, and Spanish code loads only on the Spanish home (perf test).
- **AC8 (E2E):** a new kid picks Spanish only, sees the Spanish home, and hears "¡Hola!" queued with a Spanish voice. A Math + Spanish kid switches between the two.

## UX notes
- The course card is 🇪🇸 **Spanish** with the line "Learn your first Spanish words!" (read aloud).
- The Spanish home placeholder uses the same layout as the old chess placeholder, with island colours (sea, sand) from new map tokens, so it's ready for F20.
- Spanish words are always shown **with** their sound. Instructions stay in English for a beginner.
- No timers and no "come back" nudges.

## Out of scope
- Words, question kinds and lessons (F19). The Hola Island map, stickers and launch (F20).
- Speech checking, recorded audio and cloud voices (Phase 2).
- A Spanish user interface (the app stays in English).

## Decisions on the open questions (2026-11-03)
- **Course icon: 💬, with "Español"** under the name "Spanish" on the course card. No country flag.
- **A separate Spanish limit**, not one shared with chess.
