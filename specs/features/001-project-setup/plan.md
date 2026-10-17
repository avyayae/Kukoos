# Plan — Feature 001 Project Setup & App Shell

## Approach
Scaffold with `npm create vite@latest . -- --template react-ts`, then layer on tooling. Use the **latest stable** versions at setup time and record the exact versions in `package.json` (no `^` drift surprises: commit `package-lock.json`).

| Concern | Package(s) | Notes |
|---|---|---|
| Runtime | `react`, `react-dom`, `react-router` | Library/declarative mode; routes in `src/app/routes.tsx` |
| State | `zustand` | Installed now, used from F05 |
| Styling | `tailwindcss`, `@tailwindcss/vite` | v4 CSS-first config: `@theme` maps tokens → utilities |
| Motion | `motion` | Spring presets in `src/ui/motion.ts` |
| Fonts | `@fontsource-variable/nunito`, `@fontsource/baloo-2` | Self-hosted, so it works offline and makes no third-party requests |
| PWA | `vite-plugin-pwa` | `registerType: 'autoUpdate'`, Workbox precache of `**/*.{js,css,html,svg,png,woff2,riv,mp3}` |
| Unit/component tests | `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Vitest config shares the Vite aliases |
| Property tests | `fast-check` | Sample on `rng.ts` |
| E2E | `@playwright/test` | `webServer: npm run build && npm run preview -- --port 4173` |
| Lint/format | `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`, `prettier`, `eslint-config-prettier` | Flat config |

Node: **24 LTS** (the current LTS at setup; installed v24.20.0), pinned in `.nvmrc` and `package.json#engines`.

## Domain-purity lint rule (AC3)
In `eslint.config.js`, add an override for `src/domain/**`:
```js
{
  files: ['src/domain/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['react', 'react-*', 'dexie', 'motion*', '@/ui/*', '@/features/*', '@/data/*', '@/app/*', '@/audio/*'],
          message: 'Constitution §3.2: src/domain must be pure TS (no UI, storage or I/O).' },
      ],
    }],
    'no-restricted-properties': ['error',
      { object: 'Math', property: 'random', message: 'Constitution §3.3: use createRng(seed) from domain/rng.ts.' }],
    'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'indexedDB', 'fetch'],
  },
}
```
A fixture test (`tests/lint/domain-purity.test.ts`) runs ESLint programmatically on a temp file containing `import React from 'react'` and `Math.random()` and asserts two errors. That makes AC3 a test, not a manual check.

## Files
**New**
```
.nvmrc  .gitignore  .prettierrc  .editorconfig
eslint.config.js  tsconfig.json  tsconfig.app.json  tsconfig.node.json
vite.config.ts  vitest.config.ts (or the test block in vite.config)  playwright.config.ts
.github/workflows/ci.yml
public/icons/icon-192.png  icon-512.png  maskable-512.png  favicon.svg   (placeholders)
src/main.tsx  src/app/App.tsx  src/app/routes.tsx  src/app/ShellScreen.tsx
src/ui/tokens.css   (copied from .claude/skills/mathquest-ui/references/tokens.css)
src/ui/index.css    (@import tailwindcss; @import tokens; @theme mapping; base styles)
src/ui/Button3D.tsx  src/ui/motion.ts
src/assets/kukoos-placeholder.svg
src/domain/rng.ts   (mulberry32 seeded PRNG: createRng(seed) → { next(), int(min,max), pick(arr) })
src/domain/index.ts  src/{data,features,question-kinds,visuals,audio}/README.md
src/test/setup.ts   (jest-dom, matchMedia mock)
tests/unit/rng.test.ts         (determinism + fast-check bounds)
tests/unit/Button3D.test.tsx   (renders, click, reduced-motion class)
tests/lint/domain-purity.test.ts
tests/e2e/shell.spec.ts        (renders, offline reload, same-origin requests, mobile/tablet/desktop viewports)
content/.gitkeep  tools/.gitkeep
```

## Scripts (`package.json`)
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings=0",
  "format": "prettier --write .",
  "typecheck": "tsc -b --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "verify": "npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e"
}
```
`npm run verify` is the single Definition-of-Done command that agents run before ticking a task.

## CI (`.github/workflows/ci.yml`)
Ubuntu, Node from `.nvmrc`, `npm ci`, `npx playwright install --with-deps chromium`, then `npm run verify`. Upload the Playwright report on failure.

## Test plan
| AC | Test type | Location |
|---|---|---|
| AC1 | e2e (shell renders title + Start) | `tests/e2e/shell.spec.ts` |
| AC2 | all scripts green in CI | `ci.yml` |
| AC3 | ESLint programmatic fixture | `tests/lint/domain-purity.test.ts` |
| AC4 | `tsc -b` with strict flags; alias used in tests | `typecheck` |
| AC5 | e2e: fetch `/manifest.webmanifest`, assert fields; `navigator.serviceWorker.ready` | `shell.spec.ts` |
| AC6 | e2e: load → wait SW ready → `setOffline(true)` → reload → title visible | `shell.spec.ts` |
| AC7 | e2e: collect `page.on('request')`, assert same origin | `shell.spec.ts` |
| AC8 | component: computed style of `bg-primary` equals `--color-primary` | `Button3D.test.tsx` |
| AC9 | e2e with `emulateMedia({ reducedMotion: 'reduce' })` → no transform transition | `shell.spec.ts` |
| AC10 | CI run on a PR | GitHub |
| AC11 | `tests/unit/structure.test.ts` asserts folders exist | unit |

## Deviations (recorded during implementation)
- `create-vite@9` scaffolds Vite 8, TypeScript 6, React 19.2 and ships **oxlint**. We replaced oxlint with ESLint as planned, because AC3 needs `no-restricted-properties` (to ban `Math.random`) and `jsx-a11y`.
- The scaffold was generated in the scratchpad and copied in, because the repo folder wasn't empty. Demo assets were dropped.
- `paths` is used without `baseUrl` (`baseUrl` is deprecated in TS 6).
- **ESLint 10** with `eslint-plugin-jsx-a11y@6.10` (which declares a peer of ESLint ≤ 9): an npm `overrides` entry satisfies the peer dependency, and `@eslint/compat` `fixupPluginRules` adapts the rules. Verified that `jsx-a11y/alt-text` fires. ESLint 9 was rejected because npm marks it unsupported. Remove the shim once jsx-a11y ships ESLint 10 support.
- `.prettierignore` excludes `specs/`, `.claude/` and `*.md` to protect hand-formatted tables and wireframes.

## Risks
- **Service worker in dev** can cache stale builds. Keep the PWA `devOptions.enabled = false`, and test the SW only via `preview` in e2e.
- **Tailwind v4 config is CSS-first** (no `tailwind.config.js`), so the token mapping lives in `@theme` inside `index.css`.
- **ESLint flat-config plugin compatibility** (jsx-a11y): if a plugin lags, use its flat-config export or `@eslint/compat`.
