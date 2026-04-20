import { behandlungSchema } from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { behandlungen, therapien } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { BehandlungRef } from '../types/behandlung';
import { BehandlungInputRef } from '../types/behandlungInput';

builder.mutationField('createBehandlung', (t) =>
  t.field({
    type: BehandlungRef,
    args: {
      input: t.arg({ type: BehandlungInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(behandlungSchema, args.input);
      const therapieId = Number(parsed.therapieId);
      if (!Number.isInteger(therapieId)) {
        throw new GraphQLError('Therapie-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const [therapie] = db.select().from(therapien).where(eq(therapien.id, therapieId)).all();
      if (!therapie) {
        throw new GraphQLError('Therapie nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      const effectiveArbeitsthema = parsed.arbeitsthema ?? therapie.arbeitsthema ?? null;
      const datum = new Date(`${parsed.datum}T00:00:00.000Z`);
      const [row] = db
        .insert(behandlungen)
        .values({
          therapieId,
          datum,
          be: parsed.be,
          arbeitsthema: effectiveArbeitsthema,
        })
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Unerwartete Datenbank-Antwort beim Anlegen der Behandlung');
      }
      return row;
    },
  }),
);
