import { sanitizeKindesname } from '@behandlungsverwaltung/shared';
import { and, eq } from 'drizzle-orm';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Db } from '../db/client';
import { auftraggeber as auftraggeberTbl, kinder as kinderTbl, rechnungen } from '../db/schema';
import type { Paths } from '../paths';
import { renderStundennachweisPdf } from '../pdf/stundennachweisPdf';
import { resolveTemplate } from './templateResolver';

export class RechnungFuerMonatFehltError extends Error {
  constructor(year: number, month: number, kindId: number, auftraggeberId: number) {
    super(
      `Für Jahr ${year}, Monat ${month}, Kind ${kindId}, Auftraggeber ${auftraggeberId} existiert keine Rechnung`,
    );
    this.name = 'RechnungFuerMonatFehltError';
  }
}

export interface CreateStundennachweisInput {
  year: number;
  month: number;
  kindId: number;
  auftraggeberId: number;
}

export interface CreateStundennachweisResult {
  nummer: string;
  dateiname: string;
}

function auftraggeberDisplayName(ag: {
  typ: 'firma' | 'person';
  firmenname: string | null;
  vorname: string | null;
  nachname: string | null;
}): string {
  if (ag.typ === 'firma') return ag.firmenname ?? '';
  return `${ag.vorname ?? ''} ${ag.nachname ?? ''}`.trim();
}

// AC-STD-03/04: Stundennachweis inherits the Rechnung's nummer and is written
// to `paths.timesheetsDir` as `<nummer>-<Vorname>_<Nachname>.pdf`.
export async function createStundennachweis(
  db: Db,
  paths: Paths,
  input: CreateStundennachweisInput,
): Promise<CreateStundennachweisResult> {
  const [rechnung] = db
    .select()
    .from(rechnungen)
    .where(
      and(
        eq(rechnungen.jahr, input.year),
        eq(rechnungen.monat, input.month),
        eq(rechnungen.kindId, input.kindId),
        eq(rechnungen.auftraggeberId, input.auftraggeberId),
      ),
    )
    .all();
  if (!rechnung) {
    throw new RechnungFuerMonatFehltError(
      input.year,
      input.month,
      input.kindId,
      input.auftraggeberId,
    );
  }

  const [kind] = db.select().from(kinderTbl).where(eq(kinderTbl.id, input.kindId)).all();
  if (!kind) throw new Error(`Kind ${input.kindId} nicht gefunden`);
  const [ag] = db
    .select()
    .from(auftraggeberTbl)
    .where(eq(auftraggeberTbl.id, input.auftraggeberId))
    .all();
  if (!ag) throw new Error(`Auftraggeber ${input.auftraggeberId} nicht gefunden`);

  const templatePath = resolveTemplate(db, paths, 'stundennachweis', input.auftraggeberId);
  const templateBytes = new Uint8Array(readFileSync(templatePath));

  const pdfBytes = await renderStundennachweisPdf({
    templateBytes,
    nummer: rechnung.nummer,
    year: input.year,
    month: input.month,
    kindDisplayName: `${kind.vorname} ${kind.nachname}`,
    auftraggeberDisplayName: auftraggeberDisplayName(ag),
  });

  const dateiname = `${rechnung.nummer}-${sanitizeKindesname(kind.vorname, kind.nachname)}.pdf`;
  writeFileSync(join(paths.timesheetsDir, dateiname), pdfBytes);

  return { nummer: rechnung.nummer, dateiname };
}
