import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { auftraggeber } from './auftraggeber';
import { kinder } from './kinder';

export const rechnungen = sqliteTable(
  'rechnungen',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nummer: text('nummer').notNull().unique(),
    jahr: integer('jahr').notNull(),
    monat: integer('monat').notNull(),
    kindId: integer('kind_id')
      .notNull()
      .references(() => kinder.id),
    auftraggeberId: integer('auftraggeber_id')
      .notNull()
      .references(() => auftraggeber.id),
    stundensatzCentsSnapshot: integer('stundensatz_cents_snapshot').notNull(),
    gesamtCents: integer('gesamt_cents').notNull(),
    dateiname: text('dateiname').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    uniquePerMonthKindAuftraggeber: uniqueIndex(
      'rechnungen_jahr_monat_kind_auftraggeber_unique',
    ).on(t.jahr, t.monat, t.kindId, t.auftraggeberId),
  }),
);

export type Rechnung = typeof rechnungen.$inferSelect;
export type NewRechnung = typeof rechnungen.$inferInsert;
