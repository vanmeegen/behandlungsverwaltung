import { therapieSchema, type TherapieInputType } from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { therapien } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { TherapieRef } from '../types/therapie';
import { TherapieInputRef } from '../types/therapieInput';

interface RowValues {
  kindId: number;
  auftraggeberId: number;
  form: TherapieInputType['form'];
  kommentar: string | null;
  bewilligteBe: number;
  arbeitsthema: string | null;
}

function toRowValues(parsed: TherapieInputType): RowValues {
  return {
    kindId: Number(parsed.kindId),
    auftraggeberId: Number(parsed.auftraggeberId),
    form: parsed.form,
    kommentar: parsed.kommentar,
    bewilligteBe: parsed.bewilligteBe,
    arbeitsthema: parsed.arbeitsthema,
  };
}

builder.mutationField('createTherapie', (t) =>
  t.field({
    type: TherapieRef,
    args: {
      input: t.arg({ type: TherapieInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(therapieSchema, args.input);
      try {
        const [row] = db.insert(therapien).values(toRowValues(parsed)).returning().all();
        if (!row) {
          throw new GraphQLError('Unerwartete Datenbank-Antwort beim Anlegen der Therapie');
        }
        return row;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('FOREIGN KEY')) {
          throw new GraphQLError('Kind oder Auftraggeber nicht gefunden', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        throw err;
      }
    },
  }),
);

builder.mutationField('updateTherapie', (t) =>
  t.field({
    type: TherapieRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: TherapieInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(therapieSchema, args.input);
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Therapie-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const [row] = db
        .update(therapien)
        .set({ ...toRowValues(parsed), updatedAt: new Date() })
        .where(eq(therapien.id, numericId))
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Therapie nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return row;
    },
  }),
);
