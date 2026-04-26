import { asc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
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

builder.queryField('kind', (t) =>
  t.field({
    type: KindRef,
    args: { id: t.arg.id({ required: true }) },
    resolve: (_parent, args, { db }) => {
      const row = db
        .select()
        .from(kinder)
        .where(eq(kinder.id, Number(args.id)))
        .get();
      if (!row) {
        throw new GraphQLError('Kind nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      return row;
    },
  }),
);
