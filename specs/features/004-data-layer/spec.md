# Feature 004 — Data Layer: Save Progress (local-first)

**Status:** Draft (awaiting review)  ·  **Constitution check:** §1.5 privacy (data stays on the device), §3.5 local-first and sync-ready (repositories, `id/profileId/updatedAt/version`, outbox), §3.6 offline always works, §3.2 domain stays pure (storage lives in `src/data`)

## Why
Right now every lesson disappears when the tab closes. Before mastery (F06), rewards and streaks (F08) and the parent dashboard (F11) can exist, the app needs a **durable, private record of what the kid did**. That record must be:
- **Local:** IndexedDB on the device. No accounts, nothing leaves the device.
- **Safe:** the parent can back it up to a file and restore it, because browsers can clear site data.
- **Sync-ready:** every row has the fields a future .NET sync needs, and every change is queued in an outbox. Phase 2 can then add sync without a rewrite.

## User stories
- As a **kid**, I want my finished missions to still be there tomorrow, and to see my best score on each mission card.
- As a **parent**, I want to download a backup file and restore it on this or another device, so progress is never lost.
- As a **parent**, I want the app to ask the browser to keep its data ("persistent storage").
- As the **developer**, I want all storage behind repository interfaces, so F06/F08/F11 and Phase 2 sync plug in without touching UI code.

## Scope
### Database (Dexie / IndexedDB, schema version 1)
All tables from `specs/03-architecture.md §5` are created now, so later features don't need schema migrations for their own tables. F04 itself only **writes** `profiles`, `settings`, `lessons`, `attempts` and `outbox`.

| Table | Written in F04? | Key fields |
|---|---|---|
| `profiles` | ✅ default profile | id, nickname, grade, avatar, createdAt, updatedAt, version |
| `settings` | ✅ `global` row (current profile) | id (`global` or profileId), currentProfileId, … |
| `lessons` | ✅ | id, profileId, skillId, seed, startedAt, endedAt, completed, questionCount, firstTryCorrect, bestCombo, durationMs |
| `attempts` | ✅ one row per question outcome | id, profileId, lessonId, skillId, questionId, kind, difficulty, firstTry, solved, attempts, misconceptions[], at |
| `outbox` | ✅ one entry per write | id, table, rowId, op, at |
| `skillProgress`, `wallet`, `inventory`, `badges`, `dailyActivity` | schema only | (F06, F08, F10) |

Every syncable row has `id` (UUID), `profileId`, `updatedAt`, `version` (starts at 1, +1 per update).

### Behaviour
- **First launch:** create a default profile ("Explorer", grade 2) and set it as the current profile. Onboarding and profile picking come in F10.
- **Saving a lesson:** when a lesson completes, save one `lessons` row and one `attempts` row per question result, in **one transaction** with their outbox entries. A lesson exited early is saved with `completed: false` if at least one question was answered. Saving is idempotent: the lesson id is stable, so saving twice never duplicates rows.
- **Mission cards show progress:** each skill card in the practice picker shows the **best first-try score** of completed lessons for the current profile (e.g. "⭐ 90%"), plus "New!" for skills never played.
- **Persistent storage:** after the first saved lesson, call `navigator.storage.persist()` once. The result is shown on the backup screen.
- **Backup screen** (`/backup`, temporary; it moves into the Parent zone in F11), linked from the practice picker footer ("For grown-ups: backup"):
  - **Export** downloads `kukoos-backup-YYYY-MM-DD.json`: `{ app: "kukoos", schemaVersion, exportedAt, tables: { … } }`.
  - **Import** validates the file (app name, schema version ≤ current, table shapes) and, after a confirm ("This replaces progress on this device"), **replaces** all data in one transaction. Invalid files show a friendly error and change nothing.
  - Shows whether storage is persistent, plus a row count summary.
- **Failure safety:** if IndexedDB is unavailable (e.g. some private modes), the app still plays. Saving fails quietly, and the backup screen says progress can't be saved in this browser.

## Acceptance criteria
- **AC1 — Schema:** `db.ts` defines schema v1 with all 10 tables and the indexes needed by F04/F06/F08 queries (`[profileId+skillId]`, `[profileId+at]`, `lessonId`). A unit test opens a fresh DB and finds every table.
- **AC2 — Default profile:** on a fresh DB, `ensureCurrentProfile()` creates exactly one profile and the `global` settings row. Calling it again returns the same profile.
- **AC3 — Save lesson:** given a completed `LessonState`, `saveLesson()` writes 1 lesson row + N attempt rows + N + 1 outbox entries in one transaction, with correct derived fields (first-try count, duration, misconceptions). Saving the same lesson again changes nothing.
- **AC4 — Early exit:** exiting with ≥ 1 answered question saves `completed: false`. Exiting with none saves nothing.
- **AC5 — Sync fields:** every written syncable row has a UUID `id`, `profileId`, `updatedAt` (ms), and `version` (1). Every write has a matching outbox entry (`op: 'put'`).
- **AC6 — Best score:** `bestFirstTryBySkill(profileId)` returns the best first-try percentage among *completed* lessons per skill. The picker shows it on the card, or "New!".
- **AC7 — Export:** the backup contains all tables, `schemaVersion`, and `exportedAt`. Exporting, wiping and importing is a lossless round trip (deep-equal tables).
- **AC8 — Import validation:** wrong app name, newer schema version, malformed JSON, or wrong table shapes are rejected with a friendly message, and existing data is untouched.
- **AC9 — Persistence request:** `requestPersistence()` calls `navigator.storage.persist()` at most once per device. The backup screen shows "Saved for keeps ✓" or "The browser may clear this, so back up!".
- **AC10 — No storage:** with IndexedDB unavailable, lessons still play to completion, nothing throws, and the backup screen explains the situation.
- **AC11 — E2E:** play a seeded lesson to completion, reload the page, and the picker shows that skill's score. Export a backup, clear the site data, import it, and the score is back.
- **AC12 — Purity:** `src/domain` doesn't import `src/data` (existing lint rule). UI reaches storage only via the repository hooks/context, never by importing Dexie directly (new lint rule for `src/features`, `src/ui`, `src/question-kinds`, `src/visuals`).

## Out of scope
- Mastery and spaced review (F06; it will read `attempts` and write `skillProgress`).
- XP, gems, streaks, time limits, daily activity (F08).
- Profile picker, avatar, nickname onboarding (F10). Parent PIN and settings (F11).
- Cloud sync and the .NET API (Phase 2). The outbox is written but nothing reads it yet.

## Open questions
1. **Default profile nickname:** "Explorer" until onboarding (F10) asks for her name. *Proposed: yes.*
2. **Import replaces instead of merging:** simpler and predictable. Merging comes with sync in Phase 2. *Proposed: replace, with a confirm.*
