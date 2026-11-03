# Kukoos — agent guide

Kid-focused learning adventure with courses: Math (Common Core Grade 2–3) and Chess (basics to a first win, v2). Vite + React + TS PWA, local-first (Dexie/IndexedDB).

## Always
1. Read `specs/00-constitution.md` before any work. It overrides everything else.
2. Work only from an approved feature spec in `specs/features/NNN-*/`. If none exists, draft `spec.md` from `specs/_templates/` and stop for review.
3. Implement one task from `tasks.md` at a time; tick it when its "done when" test passes.
4. Keep `src/domain/` pure: no React, Dexie, DOM or `Math.random` (use `domain/rng.ts`).
5. Correct answers are computed by code. Never let AI-generated text define an answer.
6. For ANY UI work (components, screens, styling, animation, copy), load the `mathquest-ui` skill (`.claude/skills/mathquest-ui/`) and use only its design tokens. For motion, also load `motion-design`; for visual direction, `frontend-design`.
7. Before ticking a task, run `npm run verify` (lint + typecheck + unit + build + e2e).

## Current feature
`specs/features/014-chess-rules/` + `specs/features/015-chess-board/` on branch `feature/014-015-chess-rules-board` (stacked on F013, PR #11). Chess rules: import `@/domain/chess` (never the `@/domain` barrel; chess.js only inside `src/domain/chess`, lint-enforced). Chess UI loads lazily (`/chess/board`). Done: 001–013. Next: F16 chess curriculum and map (`specs/04-roadmap.md` → v2).
Deployed by `.github/workflows/pages.yml` to https://avyayae.github.io/Kukoos/ (`BASE_PATH=/Kukoos/`).
Storage: UI uses `useRepos()` / hooks from `@/data` (Dexie only inside `src/data`, lint-enforced).
The domain API lives at `@/domain`: `generateQuestion`, `check`, `SKILLS`, `unlockedSkills`, `solveColumns`, etc.

## Git workflow
Run `npm run verify` locally first, then push to a `feature/NNN-*` branch and open a PR. Never push to `main` directly.

## Commands
- `npm run dev` · `npm test` · `npm run test:e2e` (builds, then Playwright on phone/tablet/desktop) · `npm run lint` · `npm run typecheck` · `npm run format`
- `npm run verify`: the Definition-of-Done gate (format check → lint → typecheck → unit → build → e2e)
- `npm run icons`: regenerate the favicon and PWA icons from `public/kukoos.svg`

## Environment notes (Windows dev machine)
- Git and Node were installed via winget. If `git`/`node` aren't found in a fresh shell, refresh PATH from the Machine and User environment variables.
- Windows PowerShell 5.1: `Set-Content` here doesn't accept `-Encoding`, so write files with the editor tools.

## Reference
- Product: `specs/01-product-spec.md`
- Skills/CCSS: `specs/02-curriculum-skill-map.md`
- Architecture: `specs/03-architecture.md`
- Roadmap: `specs/04-roadmap.md`
