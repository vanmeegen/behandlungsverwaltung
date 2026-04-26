import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { auftraggeber } from './auftraggeber';
import { kinder } from './kinder';

export const THERAPIE_FORM = [
  'dyskalkulie',
  'lerntherapie',
  'lrs_therapie',
  'resilienztraining',
  'heilpaedagogik',
  'elternberatung',
  'sonstiges',
] as const;
export type TherapieForm = (typeof THERAPIE_FORM)[number];

export const TAETIGKEIT = [
  ...THERAPIE_FORM,
  'elterngespraech',
  'lehrergespraech',
  'bericht',
  'foerderplan',
  'teamberatung',
] as const;
export type Taetigkeit = (typeof TAETIGKEIT)[number];

export const therapien = sqliteTable('therapien', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kindId: integer('kind_id')
    .notNull()
    .references(() => kinder.id),
  auftraggeberId: integer('auftraggeber_id')
    .notNull()
    .references(() => auftraggeber.id),
  form: text('form', { enum: THERAPIE_FORM }).notNull(),
  kommentar: text('kommentar'),
  bewilligteBe: integer('bewilligte_be').notNull(),
  taetigkeit: text('taetigkeit', { enum: TAETIGKEIT }),
  gruppentherapie: integer('gruppentherapie', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Therapie = typeof therapien.$inferSelect;
export type NewTherapie = typeof therapien.$inferInsert;
