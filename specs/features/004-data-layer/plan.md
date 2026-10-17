# Plan — Feature 004 Data Layer

## Approach
```
UI (features)  ──useRepos()──►  Repositories (interfaces, src/data/repositories/types.ts)
                                   │
                                   └─ Dexie implementations (src/data/dexie/*) ──► IndexedDB (db.ts, schema v1)
Domain (pure) ── LessonState ──► mappers (src/data/mappers.ts) build rows from domain results
```
- **Dexie 4** (`dexie`) for IndexedDB, and **`dexie-react-hooks`** `useLiveQuery` so the picker updates live.
- **`fake-indexeddb`** in Vitest, so data tests run in Node/jsdom without a browser.
- **One write path:** `writeRows(table, rows)` puts rows **and** their outbox entries in the same `rw` transaction. Repositories never write a table directly, so AC5 holds by construction.
- **Repositories are injected** with a React context (`DataProvider`). Tests can pass an in-memory DB, and the no-storage case gets a `NullRepositories` that does nothing (AC10).
- **IDs:** `crypto.randomUUID()`. **Lesson id** = a UUID generated when the lesson starts and kept in LessonScreen state, so saving is idempotent (AC3).

## Files
```
src/data/db.ts                     Dexie subclass, SCHEMA_VERSION = 1, table typings, openDb()
src/data/rows.ts                   row types (ProfileRow, LessonRow, AttemptRow, OutboxRow, …)
src/data/write.ts                  writeRows(): rows + outbox in one transaction, version bump on update
src/data/mappers.ts                lessonToRows(LessonState, ids, at) → { lesson, attempts }
src/data/repositories/types.ts     Repositories interface: profiles, lessons, backup, storage
src/data/repositories/dexie.ts     Dexie implementation
src/data/repositories/null.ts      no-op implementation (no IndexedDB)
src/data/backup.ts                 exportBackup / validateBackup / importBackup
src/data/persistence.ts            requestPersistence() (once), isPersisted()
src/data/DataProvider.tsx          context + useRepos() + createRepositories() with IndexedDB detection
src/data/useCurrentProfile.ts      ensures the default profile; live current profile
src/features/practice/PracticeScreen.tsx   + best score / "New!" + footer backup link
src/features/backup/BackupScreen.tsx       export / import / persistence status
src/features/lesson-player/LessonScreen.tsx save on complete and on early exit
src/app/App.tsx                    wraps the router in DataProvider
eslint.config.js                   no 'dexie' imports outside src/data
tests/unit/data/*.test.ts          schema, write path, mappers, repositories, backup, persistence, null repos
tests/e2e/progress.spec.ts         reload keeps the score; export → clear → import round trip
```

## Data contracts (sketch)
```ts
interface LessonRow extends SyncFields {
  skillId: SkillId; seed: number; startedAt: number; endedAt: number; completed: boolean
  questionCount: number; firstTryCorrect: number; bestCombo: number; durationMs: number
}
interface AttemptRow extends SyncFields {
  lessonId: string; skillId: SkillId; questionId: string; kind: QuestionKind; difficulty: Difficulty
  firstTry: boolean; solved: boolean; attempts: number; misconceptions: MisconceptionKey[]; at: number
}
interface SyncFields { id: string; profileId: string; updatedAt: number; version: number }
interface OutboxRow { id: string; table: TableName; rowId: string; op: 'put' | 'delete'; at: number }

interface Repositories {
  available: boolean
  profiles: { ensureCurrent(): Promise<ProfileRow>; current(): Promise<ProfileRow | undefined> }
  lessons: {
    save(state: LessonState, meta: { lessonId: string; profileId: string; at: number }): Promise<void>
    bestFirstTryBySkill(profileId: string): Promise<Record<SkillId, number>>
  }
  backup: { export(): Promise<BackupFile>; import(file: unknown): Promise<ImportResult>; counts(): Promise<Record<TableName, number>> }
  storage: { requestPersistence(): Promise<boolean>; isPersisted(): Promise<boolean | null> }
}
```

## Test plan
| AC | Test |
|---|---|
| AC1 | `db.test.ts`: fresh DB has 10 tables and the expected indexes |
| AC2 | `profiles.test.ts`: ensureCurrent idempotent, one profile + global settings |
| AC3–AC5 | `lessons.test.ts`: save a completed/partial lesson from a real `LessonState`, counts, derived fields, outbox, idempotency |
| AC6 | `lessons.test.ts` + `PracticeScreen` component test with a seeded DB |
| AC7–AC8 | `backup.test.ts`: round trip deep-equal; each invalid case rejected, data untouched |
| AC9 | `persistence.test.ts`: mocked `navigator.storage`, called once, flag stored |
| AC10 | `null.test.ts` + LessonScreen test with NullRepositories |
| AC11 | `progress.spec.ts` on 3 devices |
| AC12 | lint fixture test (like the domain-purity test) |

## Risks
- **Safari private mode / quota:** detect and fall back to NullRepositories. Wrap every write in try/catch, and log only in dev.
- **Schema evolution:** later features add tables or indexes via `db.version(2)` with an upgrade function. The pattern is documented in `db.ts`, and schema v1 already includes all known tables to minimise migrations.
- **Backup size:** attempts grow at roughly 12 rows per lesson, about 100 KB/month. Fine for JSON.
