import { inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { rechnungen } from '../../db/schema';
import { KeineBehandlungenError } from '../../services/rechnungAggregation';
import { createMonatsrechnung, RechnungExistiertError } from '../../services/rechnungService';
import { TemplateFileMissingError, TemplateNotFoundError } from '../../services/templateResolver';
import { builder, resolvePaths } from '../builder';
import { RechnungRef } from '../types/rechnung';
import { CreateMonatsrechnungInputRef } from '../types/rechnungInput';

// PRD §3.8: Markiert Rechnungen nach dem ZIP-Download als "zum Versand
// heruntergeladen". Der tatsächliche Versand liegt außerhalb der App;
// wir vermerken nur das Download-Timestamp.
builder.mutationField('markRechnungenDownloaded', (t) =>
  t.field({
    type: [RechnungRef],
    args: {
      ids: t.arg.idList({ required: true }),
    },
    resolve: (_parent, args, { db }) => {
      const numericIds = args.ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));
      if (numericIds.length === 0) return [];
      const now = new Date();
      return db
        .update(rechnungen)
        .set({ downloadedAt: now })
        .where(inArray(rechnungen.id, numericIds))
        .returning()
        .all();
    },
  }),
);

builder.mutationField('createMonatsrechnung', (t) =>
  t.field({
    type: RechnungRef,
    args: {
      input: t.arg({ type: CreateMonatsrechnungInputRef, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const { db } = ctx;
      const paths = resolvePaths(ctx);
      const { year, month, kindId, auftraggeberId } = args.input;
      if (!Number.isInteger(year) || year < 1000 || year > 9999) {
        throw new GraphQLError('Jahr ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new GraphQLError('Monat muss zwischen 1 und 12 liegen', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      try {
        return await createMonatsrechnung(db, paths, {
          year,
          month,
          kindId: Number(kindId),
          auftraggeberId: Number(auftraggeberId),
          force: args.input.force ?? false,
        });
      } catch (err) {
        if (err instanceof RechnungExistiertError) {
          throw new GraphQLError('Für diesen Monat wurde bereits eine Rechnung erzeugt.', {
            extensions: { code: 'DUPLICATE_RECHNUNG' },
          });
        }
        if (err instanceof KeineBehandlungenError) {
          throw new GraphQLError('Für den gewählten Monat liegen keine Behandlungen vor.', {
            extensions: { code: 'KEINE_BEHANDLUNGEN' },
          });
        }
        if (err instanceof TemplateNotFoundError) {
          throw new GraphQLError('Keine Rechnungsvorlage hinterlegt.', {
            extensions: { code: 'TEMPLATE_NOT_FOUND' },
          });
        }
        if (err instanceof TemplateFileMissingError) {
          throw new GraphQLError('Vorlagen-Datei fehlt auf der Festplatte.', {
            extensions: { code: 'TEMPLATE_FILE_MISSING' },
          });
        }
        throw err;
      }
    },
  }),
);
