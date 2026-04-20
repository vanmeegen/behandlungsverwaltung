import { desc, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { behandlungen } from '../../db/schema';
import { builder } from '../builder';
import { BehandlungRef } from '../types/behandlung';

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
