import { check, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { kinder } from './kinder';
import { sql } from 'drizzle-orm';

export const erziehungsberechtigte = sqliteTable(
  'erziehungsberechtigte',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kindId: integer('kind_id')
      .notNull()
      .references(() => kinder.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    vorname: text('vorname').notNull(),
    nachname: text('nachname').notNull(),
    strasse: text('strasse'),
    hausnummer: text('hausnummer'),
    plz: text('plz'),
    stadt: text('stadt'),
    email1: text('email1'),
    email2: text('email2'),
    telefon1: text('telefon1'),
    telefon2: text('telefon2'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    uniqueKindSlot: unique().on(t.kindId, t.slot),
    checkSlot: check('slot_check', sql`${t.slot} IN (1, 2)`),
  }),
);

export type Erziehungsberechtigter = typeof erziehungsberechtigte.$inferSelect;
export type NewErziehungsberechtigter = typeof erziehungsberechtigte.$inferInsert;
