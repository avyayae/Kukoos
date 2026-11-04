# Feature 020 — Hola Island & Spanish Launch

**Status:** Draft (2026-11-03)  ·  **Constitution check:**
- §1.2: no shame (locked stops explain kindly).
- §1.3: Spanish is open play (no goal or streak; optional limit).
- §1.4: every Spanish word is heard.
- §2.1: mastery unlocks the next stop.
- §3.7: the first load stays under 2 MB; the words and lessons still load on demand.

## Why
F18 built the Spanish course frame and F19 the words and lessons. A kid still learns Spanish on a plain temporary path, and only in dev builds. F20 finishes the course:
- the **Hola Island map**, so Spanish feels like its own adventure, as Chess Castle does;
- **area stickers**;
- a **launch**, so Spanish appears on her tablet in the live app.

## User stories
- As a kid, I want to sail around **Hola Island** (Harbor → Market → Jungle Trail) and see where I am.
- As a kid, I want a **sticker** when I finish an area, and a **fiesta** when I finish the island.
- As a kid who has used up today's math time, I want to keep going in Spanish if it's still open.
- As a grown-up, I want Spanish to show on our devices, and to know when a device needs a Spanish voice.

## Scope
1. **Hola Island map** (it replaces the F19 skill path in `SpanishHome`):
   - The same path, node look and motion as the math and chess maps: locked, current (pulse plus "Start here!") and crowned nodes; scroll to the current node; **Play next**.
   - **Three island areas**, bottom to top, each with its own scenery drawn with tokens and CSS shapes: the **Harbor** ⚓ (sea, waves, a little boat), the **Market** 🧺 (sand, striped stall awnings), and the **Jungle Trail** 🌴 (greens, leaves).
   - New map tokens `--mq-island-*` (sea, sand, jungle, awning), in light and dark themes.
   - **Area signs:** tapping an area's title says its name in Spanish and English ("El puerto, the Harbor").
   - A locked stop explains kindly, as in chess: "Not yet! Get a crown in the one before first."
2. **Area stickers:** ⚓ Harbor flag, 🧺 Market basket and 🪅 Fiesta piñata. Each is earned by crowning every skill in its area, using the same `crownAll` badge rule as the chess castle areas.
   - The sticker moment plays in the shared celebration after the lesson that earns it.
   - Spanish stickers show in the Trophy Room only for kids who learn Spanish (`es.*` badges, like chess).
3. **The Fiesta:** a last stop at the top of the Jungle Trail, **"¡Fiesta!"** 🪅. It opens when the Jungle Trail is crowned.
   - It's a party lesson: 8 questions mixing words from all 18 skills, at difficulty 2–3, with no "say it" step.
   - The first finish shows a fiesta moment: confetti, with Kukoos and the island animals cheering "¡Fiesta!" in Spanish.
   - It can be replayed any time as a fun review.
4. **Launch:**
   - Remove the `VITE_SPANISH` gate. Spanish is offered in onboarding and **My courses**, and the course switcher shows it.
   - The Grown-ups Spanish voice and Spanish limit sections always show, as the chess limit does.
   - `.env.development` and `.env.e2e` lose the flag.
5. **Goodnight offers Spanish too:** when the math limit is reached, a kid who learns chess or Spanish (and whose limit for that course isn't reached) is offered it, with one button per open course.
6. **"Needs a Spanish voice" note:** if the device can speak but has **no Spanish voice**, the Spanish home shows a short note: "Ask a grown-up to add a Spanish voice for the best sound".
   - The words still play with `lang = es-MX`.
   - The F19 note for a device with no speech at all stays.

## Acceptance criteria
- **AC1 (map):**
  - The island shows 3 areas and 18 stops in skill-map order, with the correct states.
  - **Play next** opens the next stop.
  - A locked stop doesn't open and says why.
  - The map scrolls to the current stop.
  - At 360 px it fits without horizontal scroll.
- **AC2 (area signs):** tapping an area title speaks its Spanish name with `lang: 'es'` and its English name in English.
- **AC3 (stickers):** crowning the last Harbor skill earns the Harbor flag exactly once, and it plays in the celebration. The Trophy Room shows Spanish stickers only to Spanish kids.
- **AC4 (fiesta):**
  - The ¡Fiesta! stop is locked until all 6 Jungle Trail skills are crowned.
  - Its lesson draws from every area, and its questions pass the F19 checks: the answer appears exactly once, and choices have distinct pictures.
  - The first finish shows the fiesta moment once, and replays work.
- **AC5 (launch):** without any env flag, onboarding offers Math, Chess and Spanish. A Spanish-only kid sees Hola Island. The Grown-ups Spanish sections show.
- **AC6 (goodnight):** with the math limit reached, a Math + Spanish kid is offered Spanish, a Math + Chess + Spanish kid is offered both, and a course whose own limit is reached isn't offered.
- **AC7 (voice note):** with speech available but voices limited to [en-US], the Spanish home shows the Spanish voice note. With [en-US, es-MX] it doesn't.
- **AC8 (first load):** the first load stays under 2 MB. The Spanish home, words and lessons load only when Spanish is opened (perf test).
- **AC9 (E2E):** a fresh Spanish-only kid on the production build (no flag):
  - sees Hola Island;
  - plays the first lesson;
  - crowns the Harbor through skip-ahead checks and gets the Harbor flag;
  - sees it in the Trophy Room.

## UX notes
- **Island scenery** is flat shapes with 2–3 tones, from tokens only, and decorative (`aria-hidden`). It has no gradients except the sea, and no motion with reduced motion.
- **Area titles** show the English name with the Spanish name small beneath it ("Harbor · El puerto"), so a new reader isn't overwhelmed.
- **The fiesta moment** uses the shared celebration (CelebrationOrchestrator) and is never stacked with another moment.
- **No timers or nudges** (§1.3).

## Out of scope
- Chess and Spanish on the parent dashboard and report, and chess badges (F21).
- Tiny phrases, reading, spelling, speech checking and recorded audio (Phase 2).
- A Spanish user interface (the app stays in English).

## Open questions (with recommendations)
1. **Is the Fiesta a party lesson or just a celebration?** Recommendation: a **party lesson** of 8 mixed questions that can be replayed, so finishing the island also gives her a fun way to review every word.
2. **Spanish area names on the map** ("El puerto", "El mercado", "La selva"). Recommendation: **yes**, small under the English name and spoken when tapped. They're a free extra few words.
3. **The "add a Spanish voice" note** for kids on devices with no Spanish voice. Recommendation: **show it**. Without a Spanish voice, the words may be read by an English voice and sound wrong.
4. **Launch timing.** Recommendation: Spanish goes live **when this PR merges**, as chess did with F16. She'll see it on her tablet after the app updates.
