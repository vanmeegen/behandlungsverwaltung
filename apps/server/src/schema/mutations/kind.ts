import { kindSchema } from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { kinder } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { KindRef } from '../types/kind';
import { KindInputRef } from '../types/kindInput';

function toRowValues(parsed: ReturnType<typeof kindSchema.parse>): {
  vorname: string;
  nachname: string;
  geburtsdatum: Date;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  aktenzeichen: string;
} {
  return {
    vorname: parsed.vorname,
    nachname: parsed.nachname,
    geburtsdatum: new Date(`${parsed.geburtsdatum}T00:00:00.000Z`),
    strasse: parsed.strasse,
    hausnummer: parsed.hausnummer,
    plz: parsed.plz,
    stadt: parsed.stadt,
    aktenzeichen: parsed.aktenzeichen,
  };
}

builder.mutationField('createKind', (t) =>
  t.field({
    type: KindRef,
    args: {
      input: t.arg({ type: KindInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(kindSchema, args.input);
      const [row] = db.insert(kinder).values(toRowValues(parsed)).returning().all();
      if (!row) {
        throw new GraphQLError('Unerwartete Datenbank-Antwort beim Anlegen des Kindes');
      }
      return row;
    },
  }),
);

builder.mutationField('updateKind', (t) =>
  t.field({
    type: KindRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: KindInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(kindSchema, args.input);
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Kind-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const [row] = db
        .update(kinder)
        .set({ ...toRowValues(parsed), updatedAt: new Date() })
        .where(eq(kinder.id, numericId))
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Kind nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      return row;
    },
  }),
);
