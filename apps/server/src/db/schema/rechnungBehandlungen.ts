import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { behandlungen } from './behandlungen';
import { rechnungen } from './rechnungen';

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
  snapshotArbeitsthema: text('snapshot_arbeitsthema'),
  snapshotZeilenbetragCents: integer('snapshot_zeilenbetrag_cents').notNull(),
});

export type RechnungBehandlung = typeof rechnungBehandlungen.$inferSelect;
export type NewRechnungBehandlung = typeof rechnungBehandlungen.$inferInsert;
