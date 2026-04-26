import { auftraggeberSchema, type AuftraggeberInputType } from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { auftraggeber } from '../../db/schema';
import { validateOrThrow } from '../../services/validate';
import { builder } from '../builder';
import { AuftraggeberRef } from '../types/auftraggeber';
import { AuftraggeberInputRef } from '../types/auftraggeberInput';

interface RowValues {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  stundensatzCents: number;
  abteilung: string | null;
  rechnungskopfText: string;
}

function toRowValues(parsed: AuftraggeberInputType): RowValues {
  if (parsed.typ === 'firma') {
    return {
      typ: 'firma',
      firmenname: parsed.firmenname,
      vorname: null,
      nachname: null,
      strasse: parsed.strasse,
      hausnummer: parsed.hausnummer,
      plz: parsed.plz,
      stadt: parsed.stadt,
      stundensatzCents: parsed.stundensatzCents,
      abteilung: parsed.abteilung,
      rechnungskopfText: parsed.rechnungskopfText,
    };
  }
  return {
    typ: 'person',
    firmenname: null,
    vorname: parsed.vorname,
    nachname: parsed.nachname,
    strasse: parsed.strasse,
    hausnummer: parsed.hausnummer,
    plz: parsed.plz,
    stadt: parsed.stadt,
    stundensatzCents: parsed.stundensatzCents,
    abteilung: null,
    rechnungskopfText: parsed.rechnungskopfText,
  };
}

builder.mutationField('createAuftraggeber', (t) =>
  t.field({
    type: AuftraggeberRef,
    args: {
      input: t.arg({ type: AuftraggeberInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(auftraggeberSchema, args.input);
      const [row] = db.insert(auftraggeber).values(toRowValues(parsed)).returning().all();
      if (!row) {
        throw new GraphQLError('Unerwartete Datenbank-Antwort beim Anlegen des Auftraggebers');
      }
      return row;
    },
  }),
);

builder.mutationField('updateAuftraggeber', (t) =>
  t.field({
    type: AuftraggeberRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: AuftraggeberInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(auftraggeberSchema, args.input);
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Auftraggeber-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const [row] = db
        .update(auftraggeber)
        .set({ ...toRowValues(parsed), updatedAt: new Date() })
        .where(eq(auftraggeber.id, numericId))
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Auftraggeber nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return row;
    },
  }),
);

import { therapien as therapienTbl } from '../../db/schema';

builder.mutationField('deleteAuftraggeber', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Auftraggeber-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const children = db
        .select()
        .from(therapienTbl)
        .where(eq(therapienTbl.auftraggeberId, numericId))
        .all();
      if (children.length > 0) {
        throw new GraphQLError(
          'Auftraggeber ist mit einer Therapie verknüpft und kann nicht gelöscht werden',
          {
            extensions: {
              code: 'REFERENCED_BY_CHILD',
              entity: 'auftraggeber',
              childCount: children.length,
            },
          },
        );
      }
      const result = db
        .delete(auftraggeber)
        .where(eq(auftraggeber.id, numericId))
        .returning()
        .all();
      if (result.length === 0) {
        throw new GraphQLError('Auftraggeber nicht gefunden', {
          extensions: { code: 'NOT_FOUND' },
        });
      }
      return true;
    },
  }),
);
