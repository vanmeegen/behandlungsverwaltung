import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Template table showing the expected column shape for new entities.
 * Copy this pattern (primary key + createdAt + your fields) when adding
 * real domain tables like `behandlungen`.
 */
export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
