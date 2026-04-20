import { and, desc, eq, type SQL } from 'drizzle-orm';
import { rechnungen } from '../../db/schema';
import { builder } from '../builder';
import { RechnungRef } from '../types/rechnung';

builder.queryField('rechnungen', (t) =>
  t.field({
    type: [RechnungRef],
    args: {
      year: t.arg.int({ required: false }),
      month: t.arg.int({ required: false }),
      kindId: t.arg.id({ required: false }),
      auftraggeberId: t.arg.id({ required: false }),
    },
    description: 'All Rechnungen (PRD §3.4), newest nummer first.',
    resolve: (_parent, args, { db }) => {
      const clauses: SQL[] = [];
      if (args.year !== null && args.year !== undefined) {
        clauses.push(eq(rechnungen.jahr, args.year));
      }
      if (args.month !== null && args.month !== undefined) {
        clauses.push(eq(rechnungen.monat, args.month));
      }
      if (args.kindId !== null && args.kindId !== undefined) {
        clauses.push(eq(rechnungen.kindId, Number(args.kindId)));
      }
      if (args.auftraggeberId !== null && args.auftraggeberId !== undefined) {
        clauses.push(eq(rechnungen.auftraggeberId, Number(args.auftraggeberId)));
      }
      const base = db.select().from(rechnungen);
      const filtered = clauses.length > 0 ? base.where(and(...clauses)) : base;
      return filtered.orderBy(desc(rechnungen.nummer)).all();
    },
  }),
);
