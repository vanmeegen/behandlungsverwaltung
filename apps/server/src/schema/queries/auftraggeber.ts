import { asc, sql } from 'drizzle-orm';
import { auftraggeber } from '../../db/schema';
import { builder } from '../builder';
import { AuftraggeberRef } from '../types/auftraggeber';

builder.queryField('auftraggeber', (t) =>
  t.field({
    type: [AuftraggeberRef],
    description:
      'All Auftraggeber ordered by display name (firmenname for Firma, nachname for Person) ascending (PRD §3.6).',
    resolve: (_parent, _args, { db }) =>
      db
        .select()
        .from(auftraggeber)
        .orderBy(asc(sql`COALESCE(${auftraggeber.firmenname}, ${auftraggeber.nachname})`))
        .all(),
  }),
);
