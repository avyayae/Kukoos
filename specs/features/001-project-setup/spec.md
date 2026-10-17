# Feature 001 — Project Setup & App Shell

**Status:** Implemented. All ACs are verified locally; AC10 (CI) is pending the first push.  ·  **Constitution check:** §3.2 pure domain core (enforced by lint), §3.6 offline always works, §1.5 privacy (no third-party requests), §4 Definition of Done (tooling makes it checkable)

## Why
Every later feature depends on a working skeleton: build, type-checking, tests, lint rules that enforce the architecture, offline PWA behavior and CI. Getting this right once means each feature task can be "write code + tests, run one command, done". It's also the guardrail that keeps AI-generated code inside the architecture.

## User stories
- As the **developer**, I want one command each for dev, test, lint, typecheck and e2e so that AI agents and I can verify every task the same way.
- As the **developer**, I want lint to fail when `src/domain/` imports React/Dexie/DOM or uses `Math.random` so that the pure-core rule is enforced automatically, not by memory.
- As a **parent**, I want to install the app on the tablet's home screen and open it offline so that my kid can play anywhere.
- As a **parent**, I want the app to make no network calls to third parties so that nothing about my kid leaves the device.

## Acceptance criteria
- **AC1 — Dev server:** Given a fresh clone, when I run `npm ci` then `npm run dev`, then the app opens on `http://localhost:5173` and shows the app shell: a "Kukoos Math Quest" title in the Baloo 2 font, a placeholder Kukoos SVG and one chunky "Start" button.
- **AC2 — Quality gates:** Given the repo, when I run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e`, then all pass, and each has at least one real sample test (unit, component, e2e smoke).
- **AC3 — Domain purity:** Given a file in `src/domain/`, when it imports `react`, `react-dom`, `dexie`, anything from `@/ui`, `@/features`, `@/data`, or calls `Math.random`, then `npm run lint` fails with a message pointing to the constitution.
- **AC4 — Strict TypeScript:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride` are enabled, and the `@/` path alias resolves in app, tests and lint.
- **AC5 — Installable PWA:** Given a production build served over `npm run preview`, then a web manifest exists (name, short_name, icons 192/512 + maskable, `display: standalone`, theme/background color from design tokens) and a service worker is registered.
- **AC6 — Offline:** Given the app was loaded once, when the browser goes offline and the page reloads, then the app shell still renders (Playwright test using `context.setOffline(true)`).
- **AC7 — No third-party requests:** Given the production build, when the shell loads, then every network request is same-origin (Playwright asserts it). Fonts are self-hosted via `@fontsource`.
- **AC8 — Design tokens wired:** Given `src/ui/tokens.css`, then Tailwind utilities (e.g., `bg-primary`, `text-ink`, `rounded-card`) resolve to the CSS variables, and light/dark themes both render with an explicit body background.
- **AC9 — Reduced motion:** Given `prefers-reduced-motion: reduce`, then the Start button's press/bounce animation is disabled (component test or e2e with emulated media).
- **AC10 — CI:** Given a push or PR to `main`, then GitHub Actions runs lint, typecheck, unit tests, build and e2e (Chromium), and fails the run on any error.
- **AC11 — Folder skeleton:** The `src/` layout from `specs/03-architecture.md §3` exists, with an `index.ts` or `README.md` placeholder in each folder.

## UX notes
- The shell is a single centered screen: Kukoos placeholder, title, Start button (Button3D primary). It's a placeholder only; the real screens come in later features.
- It must look right at 360px, 768px and 1280px widths, with no horizontal scroll.
- Follow the `mathquest-ui` skill for every visual decision.

## Out of scope
- Dexie/IndexedDB (F04), real screens (F02+), Rive mascot (F09), deployment to Azure/Cloudflare (F12).
- Final app icons. Simple placeholder icons generated from the Kukoos SVG are fine.

## Decisions (resolved 2026-10-16)
- Repo: GitHub, `https://github.com/avyayae/Kukoos.git`, branch `main`. Local path `C:\Manoj\Projects\GameApp\Kukoos`.
- Package manager: **npm**.
- Colors: the palette in the `mathquest-ui` skill is approved as-is.
