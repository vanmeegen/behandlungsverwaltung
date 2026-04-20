import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { auftraggeber } from './auftraggeber';

export const TEMPLATE_KIND = ['rechnung', 'stundennachweis'] as const;
export type TemplateKind = (typeof TEMPLATE_KIND)[number];

export const templateFiles = sqliteTable(
  'template_files',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    kind: text('kind', { enum: TEMPLATE_KIND }).notNull(),
    auftraggeberId: integer('auftraggeber_id').references(() => auftraggeber.id),
    filename: text('filename').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => ({
    kindPerAuftraggeberUnique: uniqueIndex('template_files_kind_auftraggeber_unique').on(
      t.kind,
      t.auftraggeberId,
    ),
  }),
);

export type TemplateFile = typeof templateFiles.$inferSelect;
export type NewTemplateFile = typeof templateFiles.$inferInsert;
