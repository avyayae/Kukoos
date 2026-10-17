# Architecture — MathQuest

## 1. High-level view

```
┌──────────────────────────── Browser / Installed PWA ─────────────────────────────┐
│                                                                                  │
│  UI layer (React 19 + TS)                                                        │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ World Map   │ │ Lesson Player│ │ Rewards/Shop  │ │ Profiles │ │ Parent Zone│  │
│  └──────┬──────┘ └──────┬───────┘ └───────┬───────┘ └────┬─────┘ └─────┬──────┘  │
│         │  Question-kind renderer registry · Design system · Mascot (Rive)       │
│         │  Audio (Howler SFX + Web Speech TTS) · Motion · Confetti               │
│         ▼                                                                        │
│  App state (Zustand stores)  ◄── domain events ──►  Application services         │
│         ▼                                                                        │
│  Domain core (pure TypeScript, no React, no I/O)                                 │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │ Curriculum │ │ Generators  │ │ Lesson       │ │ Mastery +  │ │ Gamification│  │
│  │ skill graph│ │ + checkers  │ │ composer     │ │ SRS engine │ │ rules engine│  │
│  └────────────┘ └─────────────┘ └──────────────┘ └────────────┘ └─────────────┘  │
│         ▼                                                                        │
│  Repository interfaces ──► Dexie (IndexedDB) impl   [+ outbox for future sync]   │
│  Service worker (Workbox): precache app shell, assets, audio, content bank       │
└──────────────────────────────────────────────────────────────────────────────────┘
                     │  Phase 2 only (opt-in by parent)
                     ▼
┌──────────────── .NET 9 Minimal API (Azure Container Apps / App Service) ─────────┐
│  /sync (push outbox, pull since cursor) · /ai/hint · /ai/story · family pairing  │
│  EF Core ──► Azure SQL / Postgres      Anthropic API (Claude Haiku) via server   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Key decision:** a static SPA/PWA with no backend for the MVP. Everything a kid does works offline. The backend is additive: it only adds sync and the AI proxy, and the domain core doesn't change.

## 2. Tech stack
| Concern | Choice | Why |
|---|---|---|
| Build | Vite + React 19 + TypeScript (strict) | Fast, static output, you know it |
| Routing | React Router (data/library mode) | Simple screen routing |
| State | Zustand | Tiny, minimal boilerplate, easy to test |
| Persistence | Dexie.js (IndexedDB) + `navigator.storage.persist()` | Robust local DB, versioned migrations, live queries |
| Styling | Tailwind CSS v4 + CSS design tokens | Fast to build a consistent chunky UI |
| Animation | Motion (Framer Motion) + canvas-confetti | Springy, kid-friendly micro-interactions |
| Mascot | Rive (`@rive-app/react-canvas`) state machine | Duolingo-style expressive character, small files |
| Audio | Howler.js (SFX/music) + Web Speech API (TTS) | Offline TTS, no cost |
| Drag & drop | dnd-kit | Touch + mouse, accessible |
| Avatars | Layered SVG parts (own or CC0, e.g. DiceBear styles; check each style's license) | Customizable, shop-friendly |
| PWA | vite-plugin-pwa (Workbox) | Offline + installable on tablet |
| Testing | Vitest + Testing Library, fast-check, Playwright | Unit, property-based and E2E |
| Hosting | Azure Static Web Apps (free) or Cloudflare Pages | Free static hosting with HTTPS (needed for PWA) |
| Phase 2 API | ASP.NET Core 9 Minimal API + EF Core + Azure SQL | Your strength, clean sync and AI proxy |

## 3. Source layout
```
src/
  app/                 routes, providers, error boundary, app shell
  domain/              ← PURE TS. No imports from react/dexie/ui.
    curriculum/        skills.ts, worlds.ts, skillGraph.ts (prereqs, unlocks)
    generators/        one file per skill: generate(rng, difficulty) + check()
    arithmetic/        solveColumns.ts, misconceptions.ts (bug detectors from the skill map catalog)
    engine/            lessonComposer.ts, mastery.ts, srs.ts, difficulty.ts, startingPoint.ts
    gamification/      events.ts, xp.ts, streak.ts, timeBudget.ts, badges.ts (rules as data), shop.ts
    rng.ts             seeded PRNG (mulberry32)
    types.ts
  data/
    db.ts              Dexie schema + migrations
    repositories/      interfaces + Dexie implementations
    backup.ts          JSON export/import with schema version
  features/
    onboarding/  world-map/  lesson-player/  rewards/  avatar-shop/  trophies/  parent-zone/
  question-kinds/      registry.ts + one renderer per kind (numeric, column, tradeBlocks, mcq, compare, trueFalse)
  visuals/             SVG components: TenFrame, BaseTenBlocks (with animated trade), ColumnGrid (carry/borrow boxes), NumberLine...
  ui/                  design system: Button3D, Card, ProgressBar, Keypad, Banner, Modal, TopBar
  audio/               sfx.ts, tts.ts, voiceLines.ts
  assets/              rive/, sfx/, avatars/, worlds/
content/               build-time AI-generated content (word-problem templates, praise lines) JSON
tools/                 content generation and validation scripts (Node + Claude API)
specs/                 this spec set + per-feature specs
tests/e2e/             Playwright
```

## 4. Core domain contracts
```ts
type SkillId = string;                       // e.g. 'add.within100.regroup'
type Difficulty = 1 | 2 | 3 | 4 | 5;

interface Skill {
  id: SkillId; worldId: string; title: string; ccss: string[];
  prereqs: SkillId[]; questionKinds: QuestionKind[]; visual?: VisualKind;
}

interface Question {
  id: string; skillId: SkillId; difficulty: Difficulty; seed: number;
  kind: 'numeric' | 'column' | 'tradeBlocks' | 'mcq' | 'compare' | 'trueFalse';
  prompt: { text: string; speech: string; visual?: VisualSpec };
  payload: unknown;                          // kind-specific (choices, array dims…)
  answer: Answer;                            // computed by code, never by AI
  hints: Hint[];                             // [visual hint, worked example]
}

interface SkillGenerator {
  skillId: SkillId;
  generate(rng: Rng, difficulty: Difficulty): Question;
  check(q: Question, response: Response): CheckResult;
}

interface CheckResult {
  correct: boolean;
  misconception?: MisconceptionKey;          // e.g. 'sub.smallerFromLarger' → targeted hint
  stepErrors?: { column: number; expected: number; got: number }[]; // for `column` kind
}

// Column arithmetic is modeled as explicit steps, so guided mode and bug detection share one engine
interface ColumnStep { column: 0 | 1 | 2; borrowFrom?: number; carryIn: number; digit: number }
function solveColumns(a: number, b: number, op: '+' | '-'): ColumnStep[];  // pure, property-tested

// Gamification is event-sourced-lite: pure reducers over domain events
type DomainEvent =
  | { type: 'AnswerSubmitted'; profileId; skillId; correct; usedHint; difficulty; at }
  | { type: 'LessonCompleted'; profileId; skillId; accuracy; perfect; durationMs; at }
  | { type: 'BossDefeated'; profileId; worldId; at }
  | { type: 'ItemPurchased'; profileId; itemId; cost; at }
  | { type: 'ActiveTimeTicked'; profileId; date; seconds; inLesson: boolean }; // drives goal & limit

// rules: (state, event) => { state', rewards: RewardEffect[] }  → UI plays celebrations
```
`RewardEffect`s (`xpGained`, `gemsGained`, `badgeUnlocked`, `streakExtended`, `levelUp`, `chestOpened`) are queued and played by a **CelebrationOrchestrator** in the UI, one at a time, so effects never overlap.

## 5. Data model (IndexedDB now → SQL later, same shape)
| Table | Key fields |
|---|---|
| `profiles` | id, nickname, grade, avatar (json), createdAt, updatedAt, version |
| `skillProgress` | id, profileId, skillId, mastery, attempts, sessionsSeen, srsBox, nextReviewAt, crowned |
| `attempts` | id, profileId, skillId, questionSeed, kind, difficulty, correct, usedHint, misconception?, responseMs, at |
| `dailyActivity` | id (profileId+date), profileId, date (local yyyy-mm-dd), lessonSeconds, totalSeconds, bonusMinutes, goalMet |
| `lessons` | id, profileId, skillId, startedAt, endedAt, accuracy, xp, gems, perfect |
| `wallet` | profileId, xpTotal, level, gems, streakCount, streakFreezes, lastGoalMetDate (local yyyy-mm-dd) |
| `inventory` | id, profileId, itemId, equipped |
| `badges` | id, profileId, badgeId, unlockedAt |
| `settings` | profileId or 'global', dailyGoalMin, dailyLimitMin (null = off), startSkillId, sound, music, tts, ttsRate, parentPinHash |
| `outbox` | id, entity, entityId, op, payload, at  *(written now, consumed by Phase 2 sync)* |

All rows carry `updatedAt` and `version`. Phase 2 sync uses **last-writer-wins per row**; `attempts` is append-only, so it is conflict-free. A family code pairs devices.

## 6. AI usage
### 6.1 Build-time (MVP): AI as content author, humans as reviewers
`tools/generate-content.ts` calls the Claude API to produce:
- **Word-problem templates** with typed slots: `"{name} has {a} {itemPlural}. A friend gives {b} more. How many now?"` plus slot constraints (`a+b ≤ 100`).
- **Praise/encouragement voice lines** (varied, age-appropriate).
- **Hint phrasings** per skill.

Output is JSON-schema validated, a script lints it (reading level, banned words, slot consistency), you review it, and it is committed to `content/`. At runtime, code fills the numbers and computes the answer, so there are **zero runtime AI calls, zero cost and zero safety risk**.

### 6.2 Runtime (Phase 2, opt-in): "Ask the mascot"
- The browser calls the .NET API (`/ai/hint`, `/ai/story`). The API key lives only on the server.
- The server sends skill id, numbers and the kid's wrong answer (no names or PII) to **Claude Haiku** with a strict system prompt and structured JSON output.
- The server **re-validates** (numbers in the text match the computed problem, length and reading-level limits, safety filter) and falls back to the static hint on any failure.
- Responses are cached by (skillId, numbers, errorPattern). Rate limited per device.

### 6.3 AI for development (spec-driven workflow)
Constitution → `specs/features/NNN-name/spec.md` → `plan.md` → `tasks.md` → implement task-by-task with Claude Code. `CLAUDE.md` points agents at the constitution and the current feature folder.

## 7. Cross-cutting concerns
- **Streak date logic:** use the device-local calendar date (`yyyy-mm-dd`), computed in one tested function. Guard against clock changes (never award twice per date).
- **Active-time tracker:** a `useActiveTime` hook ticks every 5s only when `document.visibilityState === 'visible'` and the last input was < 60s ago. It flushes to `dailyActivity` every tick (so nothing is lost if the tab is killed) and emits `ActiveTimeTicked`. Pure `timeBudget(state) → { goalProgress, remaining, warn, locked }` is unit-tested. The limit lock is a soft lock (it's a kid app, not DRM); the parent override adds `bonusMinutes`.
- **Data safety (local-only risk):** request persistent storage, offer parent JSON export, and remind the parent to back up weekly.
- **Performance:** lazy-load worlds and Rive files; preload the next lesson's assets; keep confetti particle counts modest.
- **Accessibility:** focus-visible states, ARIA live region for feedback, colorblind-safe right/wrong (icon + color), reduced-motion variants.
- **Security (Phase 2):** CORS lock, device tokens, rate limits, no PII to the LLM, server-side keys in Azure Key Vault.

## 8. Key decisions (ADR summary)
| # | Decision | Alternative rejected | Reason |
|---|---|---|---|
| 1 | Vite SPA/PWA | Next.js | No SSR/SEO need; offline-first is simpler as a static app |
| 2 | Deterministic generators | LLM-generated questions | Guaranteed-correct math, testable, free, offline |
| 3 | IndexedDB (Dexie) | localStorage | Structured queries, size limits, migrations |
| 4 | Rive mascot | GIF/Lottie only | Interactive state machine (react to right/wrong), tiny files |
| 5 | Event → reward-effect pipeline | Ad-hoc rewards in components | Testable rules, sequenced celebrations |
| 6 | Repository + outbox | Direct Dexie calls in UI | Painless Phase 2 sync to .NET/SQL |
