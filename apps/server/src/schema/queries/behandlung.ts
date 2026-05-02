import { desc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { behandlungen } from '../../db/schema';
import { builder } from '../builder';
import { BehandlungRef } from '../types/behandlung';

builder.queryField('behandlung', (t) =>
  t.field({
    type: BehandlungRef,
    nullable: true,
    args: { id: t.arg.id({ required: true }) },
    description: 'Eine einzelne Behandlung per ID — für Deep-Links in den Edit-Pfad.',
    resolve: (_parent, args, { db }) => {
      const id = Number(args.id);
      if (!Number.isInteger(id)) {
        throw new GraphQLError('Behandlung-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const [row] = db.select().from(behandlungen).where(eq(behandlungen.id, id)).limit(1).all();
      return row ?? null;
    },
  }),
);

builder.queryField('behandlungenByTherapie', (t) =>
  t.field({
    type: [BehandlungRef],
    args: { therapieId: t.arg.id({ required: true }) },
    description: 'Behandlungen of a Therapie, ordered by datum descending (PRD §2.4).',
    resolve: (_parent, args, { db }) => {
      const id = Number(args.therapieId);
      if (!Number.isInteger(id)) {
        throw new GraphQLError('Therapie-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      return db
        .select()
        .from(behandlungen)
        .where(eq(behandlungen.therapieId, id))
        .orderBy(desc(behandlungen.datum))
        .all();
    },
  }),
);
