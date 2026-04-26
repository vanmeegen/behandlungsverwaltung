import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const AUFTRAGGEBER_TYP = ['firma', 'person'] as const;
export type AuftraggeberTyp = (typeof AUFTRAGGEBER_TYP)[number];

export const auftraggeber = sqliteTable('auftraggeber', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  typ: text('typ', { enum: AUFTRAGGEBER_TYP }).notNull(),
  firmenname: text('firmenname'),
  vorname: text('vorname'),
  nachname: text('nachname'),
  strasse: text('strasse').notNull(),
  hausnummer: text('hausnummer').notNull(),
  plz: text('plz').notNull(),
  stadt: text('stadt').notNull(),
  stundensatzCents: integer('stundensatz_cents').notNull(),
  abteilung: text('abteilung'),
  rechnungskopfText: text('rechnungskopf_text').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Auftraggeber = typeof auftraggeber.$inferSelect;
export type NewAuftraggeber = typeof auftraggeber.$inferInsert;
