# Roadmap & MVP Plan

Budget: ~2–3 weeks at 15–20 h/week ≈ **45–55 hours**. The scope is cut to fit, with polish over breadth.

## Spec-driven workflow (repeat for every feature)
1. `specs/features/NNN-name/spec.md`: what and why, user stories, Given/When/Then acceptance criteria, out-of-scope. **You review and approve it.**
2. `plan.md`: technical approach, files touched, data changes, test plan (the AI agent drafts it, you approve).
3. `tasks.md`: ordered checklist of 1–3 hour tasks, each with its "done when" test.
4. Implement one task at a time with Claude Code, then run tests, commit, and tick the task.
5. Retro: update the spec if reality differed.

Template: `specs/_templates/`.

## MVP feature list (in build order)
| # | Feature | Est. |
|---|---|---|
| F01 | Project setup: Vite/TS/Tailwind/Vitest/Playwright/ESLint, CI (GitHub Actions), PWA shell | 3h |
| F02 | Design system: tokens, Button3D, Card, ProgressBar, Keypad, TopBar, fonts, reduced motion | 5h |
| F03 | Domain core: RNG, skill graph, `solveColumns` engine, misconception detectors, generators for ~24 MVP skills (most share the column engine), property tests | 9h |
| F04 | Data layer: Dexie schema, repositories, outbox, backup export/import | 4h |
| F05 | Lesson player: **`column` (guided + free) and `tradeBlocks` with animated trading** ⭐, plus numeric, mcq, compare, trueFalse; targeted hints; staircase | 12h |
| F06 | Mastery + SRS + lesson composer + parent-picked starting point (pre-mastered skills) | 3h |
| F07 | World map: 5 worlds (jungle → savanna → ocean → Moon → Mars), lock/crown states, boss nodes, launch cutscene, sticker album | 6h |
| F08 | Gamification: XP, levels, star crystals, streak + freeze, **minute-based daily goal + daily limit + active-time tracker**, badges, CelebrationOrchestrator | 7h |
| F09 | Kukoos mascot (Rive) + SFX + TTS praise/hint lines (build-time AI content) | 4h |
| F10 | Profiles & avatar builder (shop in v1.1) | 3h |
| F11 | Parent zone: PIN + gate, dashboard incl. misconceptions, settings, +10 min override | 4h |
| F12 | Polish, kid play-test, bug fixes, deploy | 4h |
| | **Total** | **~59h** |

**Never cut:** `column`, `tradeBlocks` and misconception hints. They are the learning value for the focus area.
**Cut first if behind:** (1) Kukoos as an animated SVG with CSS state classes instead of Rive (−2h; Rive later), (2) launch with Worlds 1–4 and add Mars subtraction a few days later (−2h), (3) sticker album → v1.1 (−1h).

## Kukoos art pipeline (start this in parallel during Week 1)
1. Sketch or generate concept art: round chubby bird, big eyes, bright non-green plumage (e.g., sunset orange + purple), with a space-helmet variant.
2. Vectorize into clean flat SVG layers (body, eyes, beak, wings, helmet).
3. Rig in Rive: state machine with inputs `mood` (idle/happy/cheer/think/encourage/sleep) and a `fly` trigger.
4. Export the `.riv` file to `src/assets/rive/kukoos.riv`; keep a static SVG fallback for reduced motion.

## Week-by-week
- **Week 1, "It works":** F01–F04, F05 started. Milestone: play a `36 − 28` lesson with trade blocks and the guided column, with the smaller-from-larger hint firing, saved to IndexedDB.
- **Week 2, "It's a game":** F05 done, F06–F08. Milestone: world map progression from Savanna to Mars, streaks, the daily goal ring and limit lock, XP, badges, confetti.
- **Week 3, "It's delightful":** F09–F12. Milestone: Kukoos reacts, praise is spoken, the parent dashboard shows misconceptions, the app is installed on the tablet, and she play-tests it.

## Play-test protocol (your kid is the product manager)
- Watch silently for 10 minutes. Note where they hesitate, smile or get bored.
- Ask: "What was your favorite part? What was annoying?"
- Track: lessons/day, voluntary returns, frustration moments (≥2 wrong in a row on the same skill → tune difficulty).

## Phase 2 (after MVP, ~4–6 weeks)
- Avatar shop, placement quiz.
- Space worlds: Saturn multiplication, Jupiter division, Space Station money and time, Comet measurement, Pizza Planet fractions, Galaxy shapes and data, plus new question kinds: arrays, number line, clock, coins, fraction bars, graphs.
- Story word problems from the build-time template bank.
- Boss battles as mini-games (e.g., "defeat the monster with 10 correct answers").
- .NET 9 API: family-code sync across devices, plus the "Ask the mascot" AI hints (Claude Haiku via server proxy).
- Weekly parent summary screen; printable certificates for world completion.

## Phase 3 (ideas)
- India mode (₹, lakh/crore formatting, NCERT alignment), Hindi/regional TTS.
- Parent–kid co-op challenges, seasonal events, a pet companion that grows with streaks.
