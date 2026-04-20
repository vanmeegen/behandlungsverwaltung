import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const kinder = sqliteTable('kinder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vorname: text('vorname').notNull(),
  nachname: text('nachname').notNull(),
  geburtsdatum: integer('geburtsdatum', { mode: 'timestamp' }).notNull(),
  strasse: text('strasse').notNull(),
  hausnummer: text('hausnummer').notNull(),
  plz: text('plz').notNull(),
  stadt: text('stadt').notNull(),
  aktenzeichen: text('aktenzeichen').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Kind = typeof kinder.$inferSelect;
export type NewKind = typeof kinder.$inferInsert;
