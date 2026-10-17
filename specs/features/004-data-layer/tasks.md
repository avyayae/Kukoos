# Tasks — Feature 004 Data Layer

Branch: `feature/004-data-layer`. Run `npm run verify` before ticking. Load `mathquest-ui` for UI tasks.

- [x] **T1 — Dependencies + lint boundary** · `dexie`, `dexie-react-hooks`, `fake-indexeddb` (dev). ESLint: no `dexie` imports outside `src/data`, plus a fixture test. · *done when:* AC12 test passes.
- [x] **T2 — Schema + row types** · `db.ts`, `rows.ts` (schema v1, all tables, indexes, migration pattern documented). · *done when:* AC1 passes.
- [x] **T3 — Write path** · `write.ts`: rows + outbox in one transaction, sync fields, version bump. · *done when:* tests cover put/update/outbox atomicity (AC5).
- [x] **T4 — Profiles** · default profile + global settings. · *done when:* AC2 passes.
- [x] **T5 — Lessons** · `mappers.ts` + save (complete/partial, idempotent) + best first-try by skill. · *done when:* AC3, AC4, AC6 (repository part) pass.
- [x] **T6 — Backup** · export / validate / import (replace, transactional). · *done when:* AC7, AC8 pass.
- [x] **T7 — Persistence + null repos + provider** · `persistence.ts`, `null.ts`, `DataProvider` with IndexedDB detection. · *done when:* AC9, AC10 (unit) pass.
- [x] **T8 — Wire into the app** · App provider; LessonScreen saves on complete/early exit; picker shows best score / "New!". · *done when:* component tests pass (AC3/AC4 integration, AC6 UI).
- [x] **T9 — Backup screen** · `/backup` + footer link (mathquest-ui; parent-zone styling: 48px targets, calmer copy). · *done when:* component tests for export/import/errors/status pass.
- [x] **T10 — E2E** · `progress.spec.ts`: reload keeps the score; export → clear → import round trip; no console errors. · *done when:* AC11 passes on 3 devices.
- [ ] **T11 — Wrap-up** · deviations, run locally, push the branch, open a PR, CI green.
