import { kindSchema } from '@behandlungsverwaltung/shared';
import { GraphQLError } from 'graphql';
import { kinder } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { KindRef } from '../types/kind';
import { KindInputRef } from '../types/kindInput';

builder.mutationField('createKind', (t) =>
  t.field({
    type: KindRef,
    args: {
      input: t.arg({ type: KindInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(kindSchema, args.input);
      const [row] = db
        .insert(kinder)
        .values({
          vorname: parsed.vorname,
          nachname: parsed.nachname,
          geburtsdatum: new Date(`${parsed.geburtsdatum}T00:00:00.000Z`),
          strasse: parsed.strasse,
          hausnummer: parsed.hausnummer,
          plz: parsed.plz,
          stadt: parsed.stadt,
          aktenzeichen: parsed.aktenzeichen,
        })
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Unerwartete Datenbank-Antwort beim Anlegen des Kindes');
      }
      return row;
    },
  }),
);
