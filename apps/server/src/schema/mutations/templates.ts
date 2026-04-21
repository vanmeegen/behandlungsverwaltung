import { and, eq, isNull } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { templateFiles, type TemplateKind } from '../../db/schema';
import { isPdf } from '../../services/isPdf';
import { builder, resolvePaths } from '../builder';
import { TemplateFileRef } from '../types/templateFile';
import { UploadTemplateInputRef } from '../types/templateFileInput';

function templateFilename(kind: TemplateKind, auftraggeberId: number | null): string {
  return `${kind}-${auftraggeberId === null ? 'global' : auftraggeberId}.pdf`;
}

builder.mutationField('uploadTemplate', (t) =>
  t.field({
    type: TemplateFileRef,
    args: {
      input: t.arg({ type: UploadTemplateInputRef, required: true }),
    },
    resolve: (_parent, args, ctx) => {
      const { db } = ctx;
      const paths = resolvePaths(ctx);
      const { kind, auftraggeberId, base64 } = args.input;

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(Buffer.from(base64, 'base64'));
      } catch {
        throw new GraphQLError('Ungültiges Base64', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }
      if (!isPdf(bytes)) {
        throw new GraphQLError('Datei ist keine PDF', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }

      const numericAgId =
        auftraggeberId === null || auftraggeberId === undefined ? null : Number(auftraggeberId);
      if (numericAgId !== null && !Number.isInteger(numericAgId)) {
        throw new GraphQLError('Auftraggeber-ID ist ungültig', {
          extensions: { code: 'VALIDATION_ERROR' },
        });
      }

      const storedName = templateFilename(kind, numericAgId);
      mkdirSync(paths.templatesDir, { recursive: true });
      writeFileSync(join(paths.templatesDir, storedName), bytes);

      const existing = db
        .select()
        .from(templateFiles)
        .where(
          and(
            eq(templateFiles.kind, kind),
            numericAgId === null
              ? isNull(templateFiles.auftraggeberId)
              : eq(templateFiles.auftraggeberId, numericAgId),
          ),
        )
        .all();

      if (existing.length > 0) {
        const [row] = db
          .update(templateFiles)
          .set({ filename: storedName, createdAt: new Date() })
          .where(eq(templateFiles.id, existing[0]!.id))
          .returning()
          .all();
        if (!row) {
          throw new GraphQLError('Unerwartete Datenbank-Antwort beim Aktualisieren der Vorlage');
        }
        return row;
      }

      const [row] = db
        .insert(templateFiles)
        .values({
          kind,
          auftraggeberId: numericAgId,
          filename: storedName,
        })
        .returning()
        .all();
      if (!row) {
        throw new GraphQLError('Unerwartete Datenbank-Antwort beim Speichern der Vorlage');
      }
      return row;
    },
  }),
);

// PRD §3.10 Vorlage entfernen: Datei aus templates/ löschen und DB-Zeile
// wegnehmen, damit der globale Fallback wieder greift.
import { unlinkSync } from 'node:fs';
import { TemplateKindEnum } from '../types/enums';

builder.mutationField('deleteTemplate', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      kind: t.arg({ type: TemplateKindEnum, required: true }),
      auftraggeberId: t.arg.id({ required: false }),
    },
    resolve: (_parent, args, ctx) => {
      const { db } = ctx;
      const paths = resolvePaths(ctx);
      const numericAgId =
        args.auftraggeberId === null || args.auftraggeberId === undefined
          ? null
          : Number(args.auftraggeberId);
      const rows = db
        .select()
        .from(templateFiles)
        .where(
          and(
            eq(templateFiles.kind, args.kind),
            numericAgId === null
              ? isNull(templateFiles.auftraggeberId)
              : eq(templateFiles.auftraggeberId, numericAgId),
          ),
        )
        .all();
      if (rows.length === 0) {
        throw new GraphQLError('Vorlage nicht gefunden', { extensions: { code: 'NOT_FOUND' } });
      }
      const row = rows[0]!;
      try {
        unlinkSync(join(paths.templatesDir, row.filename));
      } catch {
        // Datei fehlt — trotzdem DB-Zeile entfernen, damit der Zustand
        // konsistent bleibt.
      }
      db.delete(templateFiles).where(eq(templateFiles.id, row.id)).run();
      return true;
    },
  }),
);
