# Feature 012 — Polish & Launch

**Status:** Approved (2026-10-18)  ·  **Constitution check:** §3.6 offline always works (installed PWA), §3.7 accessible and performant (axe checks, < 2 MB initial load), §1.5 privacy (static hosting, no analytics, no server)

## Why
The app only runs from the development computer. To be played every day it must live at a stable address, **install on the tablet** like an app, and keep working offline. It also needs one last quality pass (accessibility and load size) and a simple kit for the first real play-test with her.

## Decisions (parent, 2026-10-18)
- **Hosting: GitHub Pages** (the repo is public). It deploys automatically from `main` via GitHub Actions, at `https://avyayae.github.io/Kukoos/`.

## Acceptance criteria
- **AC1 (base path):** the app builds for a sub-path (`BASE_PATH=/Kukoos/`). Routing, assets, the PWA manifest (`start_url`, `scope`) and the service worker all respect it, and local dev/tests still use `/`.
- **AC2 (deep links):** the build includes `404.html` (a copy of `index.html`), so refreshing `/Kukoos/grown-ups` on GitHub Pages loads the app instead of a 404.
- **AC3 (deploy):** `.github/workflows/pages.yml` builds with the base path, uploads the Pages artifact and deploys on every push to `main` (and on manual dispatch). CI on pull requests stays unchanged.
- **AC4 (install):**
  - Grown-ups → "Install on a tablet" shows the app address and short steps for iPad (Share → Add to Home Screen) and Android/Chrome (Install app).
  - Where the browser supports it (`beforeinstallprompt`), an **Install app** button appears.
  - When already installed (standalone), it says so.
- **AC5 (accessibility):** an automated axe check (WCAG 2 A/AA) on the map, a lesson, lesson complete, trophies, the builder, the PIN screen and the dashboard reports **no serious or critical** violations.
- **AC6 (performance):** the first visit transfers **< 2 MB** (constitution §3.7). An e2e test measures it.
- **AC7 (play-test kit):** `docs/PLAYTEST.md` holds the protocol from the roadmap (10 silent minutes, two questions, what to track) and a checklist that maps observations to dashboard views. `docs/INSTALL.md` holds the tablet install steps.

## Out of scope
- A custom domain, analytics, crash reporting (no third-party trackers, §1.5).
- Running the play-test itself: that's for you and her. The dashboard (F11) is how we read the results.
