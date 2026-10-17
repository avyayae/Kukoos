# Project Constitution — "MathQuest" (working title)

The non-negotiable principles every spec, plan, task and line of code must respect.
AI agents: read this file first. If a request conflicts with it, stop and flag the conflict.

## 1. Child-first principles
1. **Learning over engagement.** Every reward must be earned by real practice. No reward without math.
2. **No shame, no punishment.** No lives, no "game over", no red-X sounds. Mistakes get an encouraging line, a visual hint and a retry.
3. **No dark patterns.** No ads, no purchases, no guilt messages, no endless-play loops. The parent sets session limits and the app respects them.
4. **Can play without reading well.** Every prompt can be read aloud (TTS). Tap targets are at least 48px. A parent never needs to help navigate.
5. **Privacy by default.** No accounts, no analytics SDKs, no third-party trackers. Data stays on the device unless the parent turns sync on.

## 2. Learning-science principles
1. **Mastery-based progression.** A skill unlocks the next one only when it is mastered, not merely visited.
2. **Spaced review.** Mastered skills come back on a schedule so they stick.
3. **Adaptive difficulty.** Aim for about 80% success: hard enough to stretch, easy enough to stay motivated.
4. **Concrete → pictorial → abstract.** Introduce a concept with visuals (blocks, arrays, number lines) before bare numbers.
5. **Curriculum fidelity.** Every skill maps to a US Common Core (CCSS) Grade 2 or Grade 3 standard code.

## 3. Engineering principles
1. **Spec → Plan → Tasks → Code.** No feature is built without an approved `spec.md`. Acceptance criteria are written in Given/When/Then form and become tests.
2. **Pure domain core.** Curriculum, question generation, answer checking, mastery and gamification rules are pure TypeScript with no React and no I/O. They are 100% unit-testable.
3. **Correctness is provable.** Question generators are deterministic (seeded RNG) and covered by property-based tests: the answer is always correct, always in range, and never negative unless intended.
4. **AI never decides the answer.** Code computes every number and every correct answer. AI may only write narrative text (stories, hint phrasing), and code validates it.
5. **Local-first, sync-ready.** All persistence goes through repository interfaces. Every record has `id (uuid)`, `profileId`, `updatedAt`, `version`, so a sync backend can be added without a rewrite.
6. **Offline always works.** The app is a PWA. Core play never needs the network.
7. **Accessible & performant.** WCAG AA contrast, `prefers-reduced-motion` respected, 60fps animations on a mid-range tablet, initial load < 2 MB.
8. **Small, reviewable changes.** One task = one PR-sized change with tests passing.

## 4. Definition of Done (every task)
- Acceptance criteria from the spec are covered by tests (Vitest and/or Playwright).
- `npm run lint`, `npm run typecheck` and `npm test` pass.
- Works at phone (360px), tablet (768px) and laptop (1280px) widths.
- No console errors. Reduced-motion mode is verified for any new animation.
- The spec or plan is updated if the implementation deviated.
