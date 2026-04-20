import { asc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { therapien } from '../../db/schema';
import { builder } from '../builder';
import { TherapieRef } from '../types/therapie';

function parseId(raw: string, label: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    throw new GraphQLError(`${label} ist ungültig`, {
      extensions: { code: 'VALIDATION_ERROR' },
    });
  }
  return n;
}

builder.queryField('therapien', (t) =>
  t.field({
    type: [TherapieRef],
    description: 'All Therapien ordered by id ascending.',
    resolve: (_parent, _args, { db }) =>
      db.select().from(therapien).orderBy(asc(therapien.id)).all(),
  }),
);

builder.queryField('therapienByKind', (t) =>
  t.field({
    type: [TherapieRef],
    args: { kindId: t.arg.id({ required: true }) },
    description: 'Therapien filtered by Kind (PRD §3.7).',
    resolve: (_parent, args, { db }) =>
      db
        .select()
        .from(therapien)
        .where(eq(therapien.kindId, parseId(String(args.kindId), 'Kind-ID')))
        .orderBy(asc(therapien.id))
        .all(),
  }),
);

builder.queryField('therapienByAuftraggeber', (t) =>
  t.field({
    type: [TherapieRef],
    args: { auftraggeberId: t.arg.id({ required: true }) },
    description: 'Therapien filtered by Auftraggeber (PRD §3.7).',
    resolve: (_parent, args, { db }) =>
      db
        .select()
        .from(therapien)
        .where(
          eq(therapien.auftraggeberId, parseId(String(args.auftraggeberId), 'Auftraggeber-ID')),
        )
        .orderBy(asc(therapien.id))
        .all(),
  }),
);
