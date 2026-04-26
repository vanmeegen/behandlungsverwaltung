import { erziehungsberechtigterSchema } from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { erziehungsberechtigte } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { ErziehungsberechtigterRef } from '../types/erziehungsberechtigterType';
import { ErziehungsberechtigterInputRef } from '../types/erziehungsberechtigterInput';

builder.mutationField('createErziehungsberechtigter', (t) =>
  t.field({
    type: ErziehungsberechtigterRef,
    args: {
      input: t.arg({ type: ErziehungsberechtigterInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(erziehungsberechtigterSchema, args.input);
      const kindId = Number(args.input.kindId);
      try {
        const [row] = db
          .insert(erziehungsberechtigte)
          .values({
            kindId,
            slot: parsed.slot,
            vorname: parsed.vorname,
            nachname: parsed.nachname,
            strasse: parsed.strasse ?? null,
            hausnummer: parsed.hausnummer ?? null,
            plz: parsed.plz ?? null,
            stadt: parsed.stadt ?? null,
            email1: parsed.email1 ?? null,
            email2: parsed.email2 ?? null,
            telefon1: parsed.telefon1 ?? null,
            telefon2: parsed.telefon2 ?? null,
          })
          .returning()
          .all();
        if (!row) throw new GraphQLError('Unerwartete Datenbank-Antwort');
        return row;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('UNIQUE constraint failed')) {
          throw new GraphQLError('Dieser Slot ist bereits belegt', {
            extensions: { code: 'EZB_SLOT_BELEGT' },
          });
        }
        throw err;
      }
    },
  }),
);

builder.mutationField('updateErziehungsberechtigter', (t) =>
  t.field({
    type: ErziehungsberechtigterRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: ErziehungsberechtigterInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(erziehungsberechtigterSchema, args.input);
      const numericId = Number(args.id);
      const [row] = db
        .update(erziehungsberechtigte)
        .set({
          vorname: parsed.vorname,
          nachname: parsed.nachname,
          strasse: parsed.strasse ?? null,
          hausnummer: parsed.hausnummer ?? null,
          plz: parsed.plz ?? null,
          stadt: parsed.stadt ?? null,
          email1: parsed.email1 ?? null,
          email2: parsed.email2 ?? null,
          telefon1: parsed.telefon1 ?? null,
          telefon2: parsed.telefon2 ?? null,
          updatedAt: new Date(),
        })
        .where(eq(erziehungsberechtigte.id, numericId))
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Erziehungsberechtigter nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return row;
    },
  }),
);

builder.mutationField('deleteErziehungsberechtigter', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const numericId = Number(args.id);
      const result = db
        .delete(erziehungsberechtigte)
        .where(eq(erziehungsberechtigte.id, numericId))
        .returning()
        .all();
      if (result.length === 0) {
        throw new GraphQLError('Erziehungsberechtigter nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return true;
    },
  }),
);
