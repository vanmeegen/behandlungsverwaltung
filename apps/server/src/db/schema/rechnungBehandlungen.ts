import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { behandlungen } from './behandlungen';
import { rechnungen } from './rechnungen';
import { TAETIGKEIT } from './therapien';

export const rechnungBehandlungen = sqliteTable('rechnung_behandlungen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  rechnungId: integer('rechnung_id')
    .notNull()
    .references(() => rechnungen.id),
  behandlungId: integer('behandlung_id')
    .notNull()
    .references(() => behandlungen.id),
  snapshotDate: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
  snapshotBe: integer('snapshot_be').notNull(),
  snapshotTaetigkeit: text('snapshot_taetigkeit', { enum: TAETIGKEIT }),
  snapshotZeilenbetragCents: integer('snapshot_zeilenbetrag_cents').notNull(),
});

export type RechnungBehandlung = typeof rechnungBehandlungen.$inferSelect;
export type NewRechnungBehandlung = typeof rechnungBehandlungen.$inferInsert;
