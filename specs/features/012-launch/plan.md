# Plan — Feature 012 Polish & Launch

## Approach
- **Base path:**
  - `vite.config.ts` reads `BASE_PATH` (default `/`) into `base`.
  - The PWA manifest uses `start_url` and `scope` = base.
  - The router gets `basename: import.meta.env.BASE_URL`.
  - A tiny build plugin copies `dist/index.html` to `dist/404.html`.
- **Deploy:** `.github/workflows/pages.yml` runs on push to `main` and workflow_dispatch:
  - `npm ci`, then `BASE_PATH=/Kukoos/ npm run build`;
  - `actions/upload-pages-artifact`, then `actions/deploy-pages`;
  - permissions `pages: write`, `id-token: write`;
  - concurrency group `pages`.

  GitHub Pages is switched to "GitHub Actions" through the REST API.
- **Install card:** `features/grownups/InstallSection.tsx`. A `useInstallPrompt()` hook captures `beforeinstallprompt` and detects standalone via `matchMedia('(display-mode: standalone)')`.
- **Accessibility:** `@axe-core/playwright` (dev dependency) runs in `tests/e2e/a11y.spec.ts` over the key screens and fails on serious or critical violations; anything it finds gets fixed.
- **Performance:** `tests/e2e/perf.spec.ts` sums response bytes on the first load (service worker off) and asserts < 2 MB.
- **Docs:** `docs/INSTALL.md` and `docs/PLAYTEST.md`, linked from the README.

## Test plan
| AC | Test |
|---|---|
| AC1–AC2 | `npm run build` with `BASE_PATH=/Kukoos/`, then check `dist/404.html` and the manifest scope (script in the wrap-up) + unit test of the 404 plugin helper |
| AC3 | Workflow file reviewed; first run after merge |
| AC4 | `installSection.test.tsx` (prompt event → button → prompt called; standalone message) |
| AC5 | `a11y.spec.ts` |
| AC6 | `perf.spec.ts` |
| AC7 | docs present |

## Deviations (recorded during implementation)
- **Accessibility fixes from axe** (`label-content-name-mismatch`, WCAG 2.5.3): each accessible name now starts with the visible text.
  - Header stat chips: "Lv 1: level 1, …". The spoken line is still the friendly one.
  - "Play next:" button.
  - Trophy stickers: the visible name plus hidden hint text, with no `aria-label`.
  - Count-ups: final value as `sr-only` text instead of an `aria-label` on a span.
  - Also dropped the 0.9 opacity on "Play next" (contrast).
- **iOS meta tags** (`apple-mobile-web-app-capable`, title) added so Add to Home Screen opens full-screen with the right name.
- **AC1–AC2 check:** verified by hand with a `BASE_PATH=/Kukoos/` build. The manifest `start_url`/`scope`, asset URLs, `registerSW.js` scope and `404.html` all match, and `/Kukoos/` and `/Kukoos/grown-ups` render under `vite preview`. The plugin has a unit test (`tests/unit/app/spaFallback.test.ts`). On Windows, build from PowerShell: Git Bash rewrites `/Kukoos/` into a Windows path.
- **a11y/perf e2e** run on the desktop project only (one layout is enough). The perf test blocks the service worker so precaching doesn't count toward first-visit bytes.
