# Tasks — Feature 001 Project Setup & App Shell

Run `npm run verify` before ticking any task from T6 onward.

- [x] **T1 — Repo init** · `git init`, `.gitignore` (node, dist, playwright-report, coverage), `.editorconfig`, `.nvmrc` (24), first commit containing `specs/`, `CLAUDE.md`, `.claude/`. · *done when:* `git log` shows the initial commit.
- [x] **T2 — Vite scaffold** · `npm create vite@latest . -- --template react-ts`, strip the demo content, set `engines.node`. · *done when:* `npm run dev` serves a blank page.
- [x] **T3 — Strict TS + alias** · Strict flags (AC4), `@/` → `src/` in tsconfig + vite. · *done when:* `npm run typecheck` passes with an `@/` import in `main.tsx`.
- [ ] **T4 — Lint & format** · ESLint flat config (TS, react-hooks, react-refresh, jsx-a11y, prettier) + the domain-purity override. · *done when:* `npm run lint` passes on a clean tree.
- [ ] **T5 — Test harness** · Vitest + jsdom + RTL + jest-dom + fast-check; `src/test/setup.ts` with a `matchMedia` mock. · *done when:* a trivial test passes via `npm test`.
- [ ] **T6 — Domain seed: `rng.ts`** · mulberry32 `createRng(seed)` with `next`, `int`, `pick`, `shuffle`. Tests: same seed → same sequence; `int(a,b)` always in [a,b] (fast-check). · *done when:* `tests/unit/rng.test.ts` is green.
- [ ] **T7 — Domain purity test** · `tests/lint/domain-purity.test.ts` (AC3). · *done when:* the test passes, and deliberately adding `Math.random()` to `src/domain/rng.ts` makes lint fail.
- [ ] **T8 — Tailwind v4 + tokens + fonts** · Install Tailwind + @fontsource. Copy `tokens.css` from the `mathquest-ui` skill, map it in `@theme`, add base styles (body background, font, tabular numerals). · *done when:* AC8 test passes and light/dark both render.
- [ ] **T9 — Button3D + motion presets** · Build per the `mathquest-ui` skill (variants: primary, secondary, success, danger-soft, ghost; sizes md/lg/xl; pressed lip; disabled; reduced motion). · *done when:* `Button3D.test.tsx` covers click, disabled and reduced motion.
- [ ] **T10 — App shell + router** · `App.tsx`, `routes.tsx`, `ShellScreen.tsx` with the Kukoos placeholder SVG, title and Start button. · *done when:* AC1 is verified manually at 360/768/1280px.
- [ ] **T11 — Folder skeleton** · Create the architecture §3 folders with README/index placeholders, plus `structure.test.ts` (AC11). · *done when:* the test is green.
- [ ] **T12 — PWA** · `vite-plugin-pwa`, manifest with token colors, placeholder icons, precache globs, autoUpdate. · *done when:* `npm run build && npm run preview` shows "installable" in Chrome DevTools → Application.
- [ ] **T13 — Playwright e2e** · Config with webServer on preview, projects for phone (Pixel 7), tablet (iPad Mini) and desktop. `shell.spec.ts` covers AC1, AC5, AC6, AC7, AC9. · *done when:* `npm run test:e2e` is green.
- [ ] **T14 — CI** · `.github/workflows/ci.yml` running `npm run verify`. · *done when:* a PR shows a green check (AC10).
- [ ] **T15 — Wrap-up** · Update this spec/plan with deviations and record the actual package versions in `plan.md`. Mark the spec **Done**.
