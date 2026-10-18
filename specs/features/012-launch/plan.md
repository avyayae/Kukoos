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
