import { and, eq, isNull } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db/client';
import { templateFiles, type TemplateKind } from '../db/schema';
import type { Paths } from '../paths';

export class TemplateNotFoundError extends Error {
  constructor(kind: TemplateKind, auftraggeberId: number | null) {
    super(
      `Keine Vorlage für ${kind}${
        auftraggeberId === null ? ' (global)' : ` (Auftraggeber ${auftraggeberId})`
      }`,
    );
    this.name = 'TemplateNotFoundError';
  }
}

export class TemplateFileMissingError extends Error {
  constructor(filename: string) {
    super(`Vorlagen-Datei fehlt auf der Festplatte: ${filename}`);
    this.name = 'TemplateFileMissingError';
  }
}

export function resolveTemplate(
  db: Db,
  paths: Paths,
  kind: TemplateKind,
  auftraggeberId: number | null,
): string {
  let filename: string | null = null;
  if (auftraggeberId !== null) {
    const [perAg] = db
      .select()
      .from(templateFiles)
      .where(and(eq(templateFiles.kind, kind), eq(templateFiles.auftraggeberId, auftraggeberId)))
      .all();
    if (perAg) filename = perAg.filename;
  }
  if (filename === null) {
    const [global] = db
      .select()
      .from(templateFiles)
      .where(and(eq(templateFiles.kind, kind), isNull(templateFiles.auftraggeberId)))
      .all();
    if (global) filename = global.filename;
  }
  if (filename === null) {
    throw new TemplateNotFoundError(kind, auftraggeberId);
  }
  const fullPath = join(paths.templatesDir, filename);
  if (!existsSync(fullPath)) {
    throw new TemplateFileMissingError(filename);
  }
  return fullPath;
}
