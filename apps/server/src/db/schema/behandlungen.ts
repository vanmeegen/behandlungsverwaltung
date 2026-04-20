import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { therapien } from './therapien';

export const behandlungen = sqliteTable('behandlungen', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  therapieId: integer('therapie_id')
    .notNull()
    .references(() => therapien.id),
  datum: integer('datum', { mode: 'timestamp' }).notNull(),
  be: integer('be').notNull(),
  arbeitsthema: text('arbeitsthema'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Behandlung = typeof behandlungen.$inferSelect;
export type NewBehandlung = typeof behandlungen.$inferInsert;
