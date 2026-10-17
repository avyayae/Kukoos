import type { KukoosDb } from './db'
import type { OutboxRow, RowsByTable, SyncTableName } from './rows'

/** A row as callers provide it; the write path stamps updatedAt and version. */
export type NewRow<T extends SyncTableName> = Omit<RowsByTable[T], 'updatedAt' | 'version'>

export const newId = (): string => crypto.randomUUID()

/**
 * The only way rows get written (spec 004 AC5): each row is stamped with `updatedAt` and a
 * bumped `version`, and an outbox entry is added in the same transaction, so Phase 2 sync
 * sees every change. Nested calls join an outer transaction (e.g. lesson + attempts).
 */
export async function writeRows<T extends SyncTableName>(
  db: KukoosDb,
  table: T,
  rows: readonly NewRow<T>[],
  at: number,
): Promise<void> {
  if (rows.length === 0) return
  const target = db.table<RowsByTable[T], string>(table)
  await db.transaction('rw', [target, db.outbox], async () => {
    const existing = await target.bulkGet(rows.map((r) => r.id))
    const stamped = rows.map(
      (row, i) =>
        ({ ...row, updatedAt: at, version: (existing[i]?.version ?? 0) + 1 }) as RowsByTable[T],
    )
    const outbox: OutboxRow[] = rows.map((row) => ({
      id: newId(),
      table,
      rowId: row.id,
      op: 'put',
      at,
    }))
    await target.bulkPut(stamped)
    await db.outbox.bulkAdd(outbox)
  })
}
