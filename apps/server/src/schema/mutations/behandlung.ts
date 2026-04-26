import {
  assertDatumGeStartdatum,
  BehandlungVorStartdatumError,
  behandlungSchema,
} from '@behandlungsverwaltung/shared';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { behandlungen, rechnungBehandlungen, therapien } from '../../db/schema';
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
      // PRD §2.4: Tätigkeit aus Input; Fallback = Tätigkeit der Therapie.
      const effectiveTaetigkeit = parsed.taetigkeit ?? therapie.taetigkeit ?? null;
      // PRD §2.4 / AC-BEH-06: gruppentherapie aus Input; Fallback = Therapie.
      const effectiveGruppentherapie = parsed.gruppentherapie ?? therapie.gruppentherapie;
      const datum = new Date(`${parsed.datum}T00:00:00.000Z`);
      try {
        assertDatumGeStartdatum(datum, therapie.startdatum);
      } catch (err) {
        if (err instanceof BehandlungVorStartdatumError) {
          throw new GraphQLError(err.message, {
            extensions: { code: 'BEHANDLUNG_VOR_STARTDATUM' },
          });
        }
        throw err;
      }
      const [row] = db
        .insert(behandlungen)
        .values({
          therapieId,
          datum,
          be: parsed.be,
          taetigkeit: effectiveTaetigkeit,
          gruppentherapie: effectiveGruppentherapie,
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

// PRD §3.9 Behandlung bearbeiten: Datum/BE/Tätigkeit überschreiben.
builder.mutationField('updateBehandlung', (t) =>
  t.field({
    type: BehandlungRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: BehandlungInputRef, required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const parsed = validateOrThrow(behandlungSchema, args.input);
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Behandlung-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const therapieId = Number(parsed.therapieId);
      const [therapie] = db.select().from(therapien).where(eq(therapien.id, therapieId)).all();
      if (!therapie) {
        throw new GraphQLError('Therapie nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      const effectiveTaetigkeit = parsed.taetigkeit ?? therapie.taetigkeit ?? null;
      const effectiveGruppentherapie = parsed.gruppentherapie ?? therapie.gruppentherapie;
      const datum = new Date(`${parsed.datum}T00:00:00.000Z`);
      try {
        assertDatumGeStartdatum(datum, therapie.startdatum);
      } catch (err) {
        if (err instanceof BehandlungVorStartdatumError) {
          throw new GraphQLError(err.message, {
            extensions: { code: 'BEHANDLUNG_VOR_STARTDATUM' },
          });
        }
        throw err;
      }
      const [row] = db
        .update(behandlungen)
        .set({
          therapieId,
          datum,
          be: parsed.be,
          taetigkeit: effectiveTaetigkeit,
          gruppentherapie: effectiveGruppentherapie,
          updatedAt: new Date(),
        })
        .where(eq(behandlungen.id, numericId))
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Behandlung nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      return row;
    },
  }),
);

builder.mutationField('deleteBehandlung', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const numericId = Number(args.id);
      if (!Number.isInteger(numericId)) {
        throw new GraphQLError('Behandlung-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      const snapshots = db
        .select()
        .from(rechnungBehandlungen)
        .where(eq(rechnungBehandlungen.behandlungId, numericId))
        .all();
      if (snapshots.length > 0) {
        throw new GraphQLError(
          'Behandlung ist bereits in einer Rechnung enthalten und kann nicht gelöscht werden',
          {
            extensions: {
              code: 'REFERENCED_BY_CHILD',
              entity: 'behandlung',
              childCount: snapshots.length,
            },
          },
        );
      }
      const result = db
        .delete(behandlungen)
        .where(eq(behandlungen.id, numericId))
        .returning()
        .all();
      if (result.length === 0) {
        throw new GraphQLError('Behandlung nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      return true;
    },
  }),
);
