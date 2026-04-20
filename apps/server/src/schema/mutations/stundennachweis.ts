import { GraphQLError } from 'graphql';
import {
  createStundennachweis,
  RechnungFuerMonatFehltError,
} from '../../services/stundennachweisService';
import { TemplateFileMissingError, TemplateNotFoundError } from '../../services/templateResolver';
import { builder, resolvePaths } from '../builder';
import { CreateStundennachweisInputRef, StundennachweisRef } from '../types/stundennachweis';

builder.mutationField('createStundennachweis', (t) =>
  t.field({
    type: StundennachweisRef,
    args: {
      input: t.arg({ type: CreateStundennachweisInputRef, required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      const paths = resolvePaths(ctx);
      const { year, month, kindId, auftraggeberId } = args.input;
      if (!Number.isInteger(year)) {
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
        return await createStundennachweis(ctx.db, paths, {
          year,
          month,
          kindId: Number(kindId),
          auftraggeberId: Number(auftraggeberId),
        });
      } catch (err) {
        if (err instanceof RechnungFuerMonatFehltError) {
          throw new GraphQLError(
            'Für diesen Monat wurde noch keine Rechnung erzeugt. Bitte zuerst die Rechnung anlegen.',
            { extensions: { code: 'RECHNUNG_FEHLT' } },
          );
        }
        if (err instanceof TemplateNotFoundError) {
          throw new GraphQLError('Keine Stundennachweis-Vorlage hinterlegt.', {
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
