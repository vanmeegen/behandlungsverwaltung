import { asc } from 'drizzle-orm';
import { kinder } from '../../db/schema';
import { builder } from '../builder';
import { KindRef } from '../types/kind';

builder.queryField('kinder', (t) =>
  t.field({
    type: [KindRef],
    description: 'All Kinder ordered by nachname, then vorname (PRD §3.5 list view).',
    resolve: (_parent, _args, { db }) =>
      db.select().from(kinder).orderBy(asc(kinder.nachname), asc(kinder.vorname)).all(),
  }),
);
